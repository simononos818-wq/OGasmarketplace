from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import hashlib
import hmac
from enum import Enum
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="OGas Marketplace API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserRole(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class DeliveryMethod(str, Enum):
    DELIVERY = "delivery"
    PICKUP = "pickup"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class CylinderSize(str, Enum):
    KG_3 = "3kg"
    KG_6 = "6kg"
    KG_12_5 = "12.5kg"
    KG_25 = "25kg"
    KG_50 = "50kg"

class Location(BaseModel):
    latitude: float
    longitude: float
    address: str
    city: str
    state: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole
    phone: Optional[str] = None
    nin: Optional[str] = None  # National Identification Number (required for sellers)
    nin_verified: bool = False  # NIN verification status
    phone_verified: bool = False  # Phone verification status
    location: Optional[Location] = None
    referral_code: Optional[str] = None  # User's unique referral code
    referred_by: Optional[str] = None  # User ID of referrer
    referral_credits: int = 0  # Total referral earnings in Naira
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Referral(BaseModel):
    referral_id: str
    referrer_id: str  # User who referred
    referrer_role: UserRole  # Role of referrer (buyer/seller)
    referee_id: str  # User who was referred
    referee_role: UserRole  # Role of referee
    referral_code: str  # Code used
    reward_amount: int  # Amount earned (500 for buyer, 1000 for seller)
    status: str  # pending, completed, paid
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionData(BaseModel):
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleSelectionRequest(BaseModel):
    role: UserRole
    phone: Optional[str] = None
    nin: Optional[str] = None  # Required for sellers
    referral_code: Optional[str] = None  # Referral code (optional)
    location: Optional[Location] = None

class SellerProfile(BaseModel):
    seller_id: str
    user_id: str
    business_name: str
    description: Optional[str] = None
    location: Location
    phone: str
    operating_hours: Optional[str] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GasListing(BaseModel):
    listing_id: str
    seller_id: str
    prices: dict  # {"3kg": 2000, "6kg": 3500, "12.5kg": 6000, "25kg": 11000, "50kg": 20000}
    available_sizes: List[CylinderSize]
    inventory: dict = {}  # {"3kg": {"available": 50, "reserved": 5, "sold_today": 3}, ...}
    is_available: bool = True
    delivery_available: bool = True
    pickup_available: bool = True
    delivery_fee: Optional[int] = 0
    low_stock_alert: int = 10  # Alert when stock falls below this
    auto_unavailable_at: int = 0  # Automatically mark unavailable at this stock level
    last_restocked: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    order_id: str
    buyer_id: str
    seller_id: str
    listing_id: str
    cylinder_size: CylinderSize
    quantity: int
    price_per_unit: int
    total_amount: int
    delivery_method: DeliveryMethod
    delivery_address: Optional[Location] = None
    delivery_fee: int = 0
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    review_id: str
    seller_id: str
    buyer_id: str
    order_id: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    message_id: str
    sender_id: str
    receiver_id: str
    order_id: Optional[str] = None
    content: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTransaction(BaseModel):
    transaction_id: str
    order_id: str
    buyer_id: str
    seller_id: str
    amount: int
    payment_reference: str
    payment_status: PaymentStatus
    paystack_response: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= REQUEST/RESPONSE MODELS =============

class CreateSellerProfileRequest(BaseModel):
    business_name: str
    description: Optional[str] = None
    location: Location
    phone: str
    operating_hours: Optional[str] = "9:00 AM - 6:00 PM"

class CreateListingRequest(BaseModel):
    prices: dict
    available_sizes: List[CylinderSize]
    inventory: Optional[dict] = {}  # {"3kg": 50, "6kg": 30, ...}
    delivery_available: bool = True
    pickup_available: bool = True
    delivery_fee: int = 0
    low_stock_alert: int = 10
    auto_unavailable_at: int = 0

class CreateOrderRequest(BaseModel):
    seller_id: str
    listing_id: str
    cylinder_size: CylinderSize
    quantity: int
    delivery_method: DeliveryMethod
    delivery_address: Optional[Location] = None

class CreateReviewRequest(BaseModel):
    seller_id: str
    order_id: str
    rating: int
    comment: Optional[str] = None

class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str
    order_id: Optional[str] = None

class PaymentInitRequest(BaseModel):
    order_id: str

# ============= HELPER FUNCTIONS =============

def generate_referral_code(name: str, user_id: str) -> str:
    """Generate unique referral code from name and user_id"""
    # Format: FIRSTNAME + last 6 chars of user_id
    first_name = name.split()[0].upper()[:8]
    unique_suffix = user_id[-6:].upper()
    return f"{first_name}{unique_suffix}"

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def get_current_user(request: Request) -> Optional[dict]:
    """Extract user from session token (cookie or Authorization header)"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    # Find session in database
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check if session expired
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def require_auth(request: Request) -> dict:
    """Require authentication, raise 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_seller(request: Request) -> dict:
    """Require seller role"""
    user = await require_auth(request)
    if user.get("role") != UserRole.SELLER.value:
        raise HTTPException(status_code=403, detail="Seller access required")
    return user

async def require_buyer(request: Request) -> dict:
    """Require buyer role"""
    user = await require_auth(request)
    if user.get("role") != UserRole.BUYER.value:
        raise HTTPException(status_code=403, detail="Buyer access required")
    return user

# ============= AUTHENTICATION ROUTES =============

@api_router.get("/auth/session")
async def exchange_session(request: Request):
    """Exchange session_id for user data and session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session ID")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            response.raise_for_status()
            auth_data = response.json()
        except Exception as e:
            logger.error(f"Error calling Emergent Auth: {e}")
            raise HTTPException(status_code=400, detail="Invalid session ID")
    
    # Check if user exists
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if not user:
        # New user - return flag to select role
        return {
            "is_new_user": True,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "temp_session_token": auth_data["session_token"]
        }
    
    # Existing user - create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "is_new_user": False,
        "user": user,
        "session_token": session_token
    }

@api_router.post("/auth/complete-signup")
async def complete_signup(request: Request, data: RoleSelectionRequest):
    """Complete signup by selecting role"""
    # Get temp session from header
    temp_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not temp_token:
        raise HTTPException(status_code=400, detail="Missing authentication")
    
    # Verify with Emergent (temp_token is valid for a short time)
    # For now, we'll extract email from a separate header
    email = request.headers.get("X-User-Email")
    name = request.headers.get("X-User-Name")
    picture = request.headers.get("X-User-Picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Missing user data")
    
    # Validate NIN for sellers
    if data.role == UserRole.SELLER:
        if not data.nin:
            raise HTTPException(status_code=400, detail="NIN is required for sellers")
        if len(data.nin) != 11 or not data.nin.isdigit():
            raise HTTPException(status_code=400, detail="Invalid NIN format. Must be 11 digits")
    
    # Validate phone number
    if not data.phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    # Validate location for sellers
    if data.role == UserRole.SELLER and not data.location:
        raise HTTPException(status_code=400, detail="Location is required for sellers")
    
    # Validate referral code if provided
    referrer_user = None
    if data.referral_code:
        referrer_user = await db.users.find_one({"referral_code": data.referral_code.upper()}, {"_id": 0})
        if not referrer_user:
            raise HTTPException(status_code=400, detail="Invalid referral code")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    referral_code = generate_referral_code(name, user_id)
    
    user_data = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "role": data.role.value,
        "phone": data.phone,
        "nin": data.nin if data.role == UserRole.SELLER else None,
        "nin_verified": False,  # Will be verified during seller verification process
        "phone_verified": True,  # Assume phone is verified via OTP (implement later)
        "location": data.location.dict() if data.location else None,
        "referral_code": referral_code,
        "referred_by": referrer_user["user_id"] if referrer_user else None,
        "referral_credits": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_data)
    
    # Create referral record if referred by someone
    if referrer_user:
        # Determine reward amount based on referrer's role
        reward_amount = 1000 if referrer_user["role"] == "seller" else 500
        
        referral_id = f"ref_{uuid.uuid4().hex[:12]}"
        referral_record = {
            "referral_id": referral_id,
            "referrer_id": referrer_user["user_id"],
            "referrer_role": referrer_user["role"],
            "referee_id": user_id,
            "referee_role": data.role.value,
            "referral_code": data.referral_code.upper(),
            "reward_amount": reward_amount,
            "status": "pending",  # Will become "completed" after referee's first order
            "created_at": datetime.now(timezone.utc)
        }
        await db.referrals.insert_one(referral_record)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # If seller, create seller profile
    if data.role == UserRole.SELLER and data.location:
        seller_id = f"seller_{uuid.uuid4().hex[:12]}"
        await db.sellers.insert_one({
            "seller_id": seller_id,
            "user_id": user_id,
            "business_name": name,  # Default to user name
            "location": data.location.dict(),
            "phone": data.phone or "",
            "nin": data.nin,
            "nin_verified": False,
            "rating": 0.0,
            "total_reviews": 0,
            "is_verified": False,
            "verification_status": "pending",  # pending, in_progress, verified, rejected
            "created_at": datetime.now(timezone.utc)
        })
    
    return {
        "user": user_data,
        "session_token": session_token,
        "referral_code": referral_code,
        "referred_by": referrer_user["name"] if referrer_user else None
    }

@api_router.get("/auth/me")
async def get_current_user_endpoint(request: Request):
    """Get current authenticated user"""
    user = await require_auth(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

# ============= SELLER ROUTES =============

@api_router.post("/sellers/profile")
async def create_seller_profile(request: Request, profile_data: CreateSellerProfileRequest):
    """Create or update seller profile"""
    user = await require_seller(request)
    
    # Check if profile exists
    existing = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if existing:
        # Update
        await db.sellers.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "business_name": profile_data.business_name,
                "description": profile_data.description,
                "location": profile_data.location.dict(),
                "phone": profile_data.phone,
                "operating_hours": profile_data.operating_hours
            }}
        )
        return {"message": "Profile updated", "seller_id": existing["seller_id"]}
    else:
        # Create
        seller_id = f"seller_{uuid.uuid4().hex[:12]}"
        seller_data = {
            "seller_id": seller_id,
            "user_id": user["user_id"],
            "business_name": profile_data.business_name,
            "description": profile_data.description,
            "location": profile_data.location.dict(),
            "phone": profile_data.phone,
            "operating_hours": profile_data.operating_hours,
            "rating": 0.0,
            "total_reviews": 0,
            "is_verified": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.sellers.insert_one(seller_data)
        return {"message": "Profile created", "seller_id": seller_id}

@api_router.get("/sellers/my-profile")
async def get_my_seller_profile(request: Request):
    """Get my seller profile"""
    user = await require_seller(request)
    profile = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.post("/sellers/listings")
async def create_listing(request: Request, listing_data: CreateListingRequest):
    """Create gas listing"""
    user = await require_seller(request)
    
    # Get seller profile
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found. Please create profile first.")
    
    # Initialize inventory if provided
    inventory = {}
    if listing_data.inventory:
        for size, qty in listing_data.inventory.items():
            inventory[size] = {
                "available": qty,
                "reserved": 0,
                "sold_today": 0
            }
    else:
        # Initialize with zero stock
        for size in listing_data.available_sizes:
            inventory[size.value] = {
                "available": 0,
                "reserved": 0,
                "sold_today": 0
            }
    
    # Check if listing exists
    existing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    
    if existing:
        # Update
        await db.gas_listings.update_one(
            {"seller_id": seller["seller_id"]},
            {"$set": {
                "prices": listing_data.prices,
                "available_sizes": [size.value for size in listing_data.available_sizes],
                "inventory": inventory,
                "delivery_available": listing_data.delivery_available,
                "pickup_available": listing_data.pickup_available,
                "delivery_fee": listing_data.delivery_fee,
                "low_stock_alert": listing_data.low_stock_alert,
                "auto_unavailable_at": listing_data.auto_unavailable_at,
                "updated_at": datetime.now(timezone.utc),
                "last_restocked": datetime.now(timezone.utc) if listing_data.inventory else existing.get("last_restocked")
            }}
        )
        return {"message": "Listing updated", "listing_id": existing["listing_id"]}
    else:
        # Create
        listing_id = f"listing_{uuid.uuid4().hex[:12]}"
        listing = {
            "listing_id": listing_id,
            "seller_id": seller["seller_id"],
            "prices": listing_data.prices,
            "available_sizes": [size.value for size in listing_data.available_sizes],
            "inventory": inventory,
            "is_available": True,
            "delivery_available": listing_data.delivery_available,
            "pickup_available": listing_data.pickup_available,
            "delivery_fee": listing_data.delivery_fee,
            "low_stock_alert": listing_data.low_stock_alert,
            "auto_unavailable_at": listing_data.auto_unavailable_at,
            "last_restocked": datetime.now(timezone.utc) if listing_data.inventory else None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.gas_listings.insert_one(listing)
        return {"message": "Listing created", "listing_id": listing_id}

@api_router.get("/sellers/my-listing")
async def get_my_listing(request: Request):
    """Get my gas listing"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    if not listing:
        return None
    return listing

# ============= INVENTORY MANAGEMENT ROUTES =============

@api_router.patch("/sellers/inventory/update")
async def update_inventory(request: Request, inventory_update: dict):
    """Update inventory levels for specific sizes"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Create a listing first")
    
    # Update inventory
    current_inventory = listing.get("inventory", {})
    
    for size, quantity in inventory_update.items():
        if size not in current_inventory:
            current_inventory[size] = {"available": 0, "reserved": 0, "sold_today": 0}
        current_inventory[size]["available"] = quantity
    
    # Check if any size is below low stock alert
    low_stock_alert = listing.get("low_stock_alert", 10)
    low_stock_sizes = []
    for size, inv in current_inventory.items():
        if inv["available"] <= low_stock_alert:
            low_stock_sizes.append(size)
    
    # Auto-disable listing if all sizes are out of stock
    auto_unavailable_at = listing.get("auto_unavailable_at", 0)
    all_out_of_stock = all(inv["available"] <= auto_unavailable_at for inv in current_inventory.values())
    
    update_data = {
        "inventory": current_inventory,
        "updated_at": datetime.now(timezone.utc),
        "last_restocked": datetime.now(timezone.utc)
    }
    
    if all_out_of_stock:
        update_data["is_available"] = False
    
    await db.gas_listings.update_one(
        {"seller_id": seller["seller_id"]},
        {"$set": update_data}
    )
    
    return {
        "message": "Inventory updated",
        "low_stock_sizes": low_stock_sizes,
        "listing_disabled": all_out_of_stock
    }

@api_router.post("/sellers/inventory/restock")
async def restock_inventory(request: Request, restock_data: dict):
    """Add stock to existing inventory"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Create a listing first")
    
    current_inventory = listing.get("inventory", {})
    
    for size, add_quantity in restock_data.items():
        if size not in current_inventory:
            current_inventory[size] = {"available": 0, "reserved": 0, "sold_today": 0}
        current_inventory[size]["available"] += add_quantity
    
    # Re-enable listing if it was disabled
    update_data = {
        "inventory": current_inventory,
        "is_available": True,
        "updated_at": datetime.now(timezone.utc),
        "last_restocked": datetime.now(timezone.utc)
    }
    
    await db.gas_listings.update_one(
        {"seller_id": seller["seller_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Inventory restocked", "new_inventory": current_inventory}

@api_router.get("/sellers/inventory/alerts")
async def get_inventory_alerts(request: Request):
    """Get low stock alerts"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    if not listing:
        return {"alerts": []}
    
    inventory = listing.get("inventory", {})
    low_stock_alert = listing.get("low_stock_alert", 10)
    
    alerts = []
    for size, inv in inventory.items():
        available = inv.get("available", 0)
        if available <= low_stock_alert and available > 0:
            alerts.append({
                "size": size,
                "current_stock": available,
                "alert_level": low_stock_alert,
                "severity": "critical" if available <= 5 else "warning"
            })
        elif available == 0:
            alerts.append({
                "size": size,
                "current_stock": 0,
                "alert_level": low_stock_alert,
                "severity": "critical",
                "message": "OUT OF STOCK"
            })
    
    return {"alerts": alerts}

@api_router.get("/sellers/inventory/stats")
async def get_inventory_stats(request: Request):
    """Get inventory statistics"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
    if not listing:
        return {"stats": {}}
    
    inventory = listing.get("inventory", {})
    
    total_available = sum(inv.get("available", 0) for inv in inventory.values())
    total_reserved = sum(inv.get("reserved", 0) for inv in inventory.values())
    total_sold_today = sum(inv.get("sold_today", 0) for inv in inventory.values())
    
    return {
        "total_available": total_available,
        "total_reserved": total_reserved,
        "total_sold_today": total_sold_today,
        "by_size": inventory,
        "last_restocked": listing.get("last_restocked"),
        "listing_status": "available" if listing.get("is_available") else "unavailable"
    }

# Update order creation to reserve inventory
async def reserve_inventory(seller_id: str, cylinder_size: str, quantity: int):
    """Reserve inventory when order is placed"""
    listing = await db.gas_listings.find_one({"seller_id": seller_id}, {"_id": 0})
    if not listing:
        return False
    
    inventory = listing.get("inventory", {})
    if cylinder_size not in inventory:
        return False
    
    available = inventory[cylinder_size].get("available", 0)
    if available < quantity:
        return False
    
    # Reserve the stock
    inventory[cylinder_size]["available"] -= quantity
    inventory[cylinder_size]["reserved"] = inventory[cylinder_size].get("reserved", 0) + quantity
    
    await db.gas_listings.update_one(
        {"seller_id": seller_id},
        {"$set": {"inventory": inventory, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return True

async def confirm_inventory_sale(seller_id: str, cylinder_size: str, quantity: int):
    """Confirm sale and move from reserved to sold"""
    listing = await db.gas_listings.find_one({"seller_id": seller_id}, {"_id": 0})
    if not listing:
        return False
    
    inventory = listing.get("inventory", {})
    if cylinder_size not in inventory:
        return False
    
    # Move from reserved to sold
    inventory[cylinder_size]["reserved"] = max(0, inventory[cylinder_size].get("reserved", 0) - quantity)
    inventory[cylinder_size]["sold_today"] = inventory[cylinder_size].get("sold_today", 0) + quantity
    
    await db.gas_listings.update_one(
        {"seller_id": seller_id},
        {"$set": {"inventory": inventory, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return True

async def release_inventory(seller_id: str, cylinder_size: str, quantity: int):
    """Release reserved inventory if order is cancelled"""
    listing = await db.gas_listings.find_one({"seller_id": seller_id}, {"_id": 0})
    if not listing:
        return False
    
    inventory = listing.get("inventory", {})
    if cylinder_size not in inventory:
        return False
    
    # Return to available
    inventory[cylinder_size]["available"] += quantity
    inventory[cylinder_size]["reserved"] = max(0, inventory[cylinder_size].get("reserved", 0) - quantity)
    
    await db.gas_listings.update_one(
        {"seller_id": seller_id},
        {"$set": {"inventory": inventory, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return True

@api_router.get("/sellers/my-orders")
async def get_seller_orders(request: Request):
    """Get orders for my business"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        return []
    
    orders_cursor = db.orders.find({"seller_id": seller["seller_id"]}, {"_id": 0}).sort("created_at", -1)
    orders = await orders_cursor.to_list(length=100)
    
    # Enrich with buyer info
    for order in orders:
        buyer = await db.users.find_one({"user_id": order["buyer_id"]}, {"_id": 0})
        order["buyer_name"] = buyer.get("name") if buyer else "Unknown"
        order["buyer_phone"] = buyer.get("phone") if buyer else None
    
    return orders

@api_router.patch("/sellers/orders/{order_id}/status")
async def update_order_status(request: Request, order_id: str, status: OrderStatus):
    """Update order status"""
    user = await require_seller(request)
    seller = await db.sellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    
    order = await db.orders.find_one({"order_id": order_id, "seller_id": seller["seller_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Handle inventory based on status
    if status == OrderStatus.COMPLETED:
        # Confirm sale - move from reserved to sold
        await confirm_inventory_sale(
            seller["seller_id"],
            order["cylinder_size"],
            order["quantity"]
        )
    elif status == OrderStatus.CANCELLED:
        # Release reserved inventory
        await release_inventory(
            seller["seller_id"],
            order["cylinder_size"],
            order["quantity"]
        )
    
    result = await db.orders.update_one(
        {"order_id": order_id, "seller_id": seller["seller_id"]},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated", "new_status": status.value}

# ============= BUYER ROUTES =============

@api_router.get("/buyers/search-sellers")
async def search_sellers(request: Request, lat: float, lon: float, radius_km: int = 50):
    """Search for sellers within radius"""
    user = await require_buyer(request)
    
    # Get all sellers
    sellers_cursor = db.sellers.find({}, {"_id": 0})
    all_sellers = await sellers_cursor.to_list(length=1000)
    
    # Filter by distance
    nearby_sellers = []
    for seller in all_sellers:
        if seller.get("location"):
            distance = calculate_distance(
                lat, lon,
                seller["location"]["latitude"],
                seller["location"]["longitude"]
            )
            if distance <= radius_km:
                seller["distance_km"] = round(distance, 2)
                # Get listing
                listing = await db.gas_listings.find_one({"seller_id": seller["seller_id"]}, {"_id": 0})
                if listing:
                    seller["listing"] = listing
                nearby_sellers.append(seller)
    
    # Sort by distance
    nearby_sellers.sort(key=lambda x: x["distance_km"])
    
    return nearby_sellers

@api_router.get("/buyers/seller/{seller_id}")
async def get_seller_details(request: Request, seller_id: str):
    """Get seller details with listing and reviews"""
    user = await require_auth(request)
    
    seller = await db.sellers.find_one({"seller_id": seller_id}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Get listing
    listing = await db.gas_listings.find_one({"seller_id": seller_id}, {"_id": 0})
    seller["listing"] = listing
    
    # Get reviews
    reviews_cursor = db.reviews.find({"seller_id": seller_id}, {"_id": 0}).sort("created_at", -1).limit(20)
    reviews = await reviews_cursor.to_list(length=20)
    
    # Enrich reviews with buyer names
    for review in reviews:
        buyer = await db.users.find_one({"user_id": review["buyer_id"]}, {"_id": 0})
        review["buyer_name"] = buyer.get("name") if buyer else "Anonymous"
    
    seller["reviews"] = reviews
    
    return seller

@api_router.post("/buyers/orders")
async def create_order(request: Request, order_data: CreateOrderRequest):
    """Create a new order"""
    user = await require_buyer(request)
    
    # Get listing to verify price
    listing = await db.gas_listings.find_one({"listing_id": order_data.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if not listing.get("is_available"):
        raise HTTPException(status_code=400, detail="This listing is not available")
    
    # Check inventory availability
    inventory = listing.get("inventory", {})
    if order_data.cylinder_size.value in inventory:
        available = inventory[order_data.cylinder_size.value].get("available", 0)
        if available < order_data.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock. Only {available} units available"
            )
    
    # Get price
    price_per_unit = listing["prices"].get(order_data.cylinder_size.value)
    if not price_per_unit:
        raise HTTPException(status_code=400, detail="Cylinder size not available")
    
    # Calculate total
    delivery_fee = listing.get("delivery_fee", 0) if order_data.delivery_method == DeliveryMethod.DELIVERY else 0
    total_amount = (price_per_unit * order_data.quantity) + delivery_fee
    
    # Reserve inventory
    reserved = await reserve_inventory(
        order_data.seller_id, 
        order_data.cylinder_size.value, 
        order_data.quantity
    )
    
    if not reserved:
        raise HTTPException(status_code=400, detail="Could not reserve inventory")
    
    # Create order
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    order = {
        "order_id": order_id,
        "buyer_id": user["user_id"],
        "seller_id": order_data.seller_id,
        "listing_id": order_data.listing_id,
        "cylinder_size": order_data.cylinder_size.value,
        "quantity": order_data.quantity,
        "price_per_unit": price_per_unit,
        "total_amount": total_amount,
        "delivery_method": order_data.delivery_method.value,
        "delivery_address": order_data.delivery_address.dict() if order_data.delivery_address else None,
        "delivery_fee": delivery_fee,
        "status": OrderStatus.PENDING.value,
        "payment_status": PaymentStatus.PENDING.value,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.orders.insert_one(order)
    
    return {
        "message": "Order created",
        "order_id": order_id,
        "total_amount": total_amount,
        "inventory_reserved": True
    }

@api_router.get("/buyers/my-orders")
async def get_buyer_orders(request: Request):
    """Get my orders"""
    user = await require_buyer(request)
    
    orders_cursor = db.orders.find({"buyer_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    orders = await orders_cursor.to_list(length=100)
    
    # Enrich with seller info
    for order in orders:
        seller = await db.sellers.find_one({"seller_id": order["seller_id"]}, {"_id": 0})
        order["seller_name"] = seller.get("business_name") if seller else "Unknown"
        order["seller_phone"] = seller.get("phone") if seller else None
    
    return orders

@api_router.post("/buyers/reviews")
async def create_review(request: Request, review_data: CreateReviewRequest):
    """Create a review for a seller"""
    user = await require_buyer(request)
    
    # Verify order exists and belongs to buyer
    order = await db.orders.find_one({
        "order_id": review_data.order_id,
        "buyer_id": user["user_id"],
        "status": OrderStatus.COMPLETED.value
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=400, detail="Order not found or not completed")
    
    # Check if review already exists
    existing = await db.reviews.find_one({"order_id": review_data.order_id})
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this order")
    
    # Create review
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    review = {
        "review_id": review_id,
        "seller_id": review_data.seller_id,
        "buyer_id": user["user_id"],
        "order_id": review_data.order_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reviews.insert_one(review)
    
    # Update seller rating
    reviews_cursor = db.reviews.find({"seller_id": review_data.seller_id}, {"_id": 0})
    all_reviews = await reviews_cursor.to_list(length=10000)
    
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    await db.sellers.update_one(
        {"seller_id": review_data.seller_id},
        {"$set": {"rating": round(avg_rating, 1), "total_reviews": len(all_reviews)}}
    )
    
    return {"message": "Review created", "review_id": review_id}

# ============= PAYMENT ROUTES =============

# Paystack configuration (will be added to .env)
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY", "")

@api_router.post("/payments/initialize")
async def initialize_payment(request: Request, payment_data: PaymentInitRequest):
    """Initialize Paystack payment"""
    user = await require_buyer(request)
    
    # Get order
    order = await db.orders.find_one({"order_id": payment_data.order_id, "buyer_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("payment_status") == PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Order already paid")
    
    # Generate reference
    reference = f"ogas-{payment_data.order_id}-{uuid.uuid4().hex[:8]}"
    
    # Initialize Paystack transaction
    if not PAYSTACK_SECRET_KEY:
        # Mock for development
        return {
            "reference": reference,
            "authorization_url": f"https://checkout.paystack.com/{reference}",
            "access_code": reference,
            "message": "Payment initialized (MOCK MODE - Add Paystack keys)"
        }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.paystack.co/transaction/initialize",
                headers={
                    "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": user["email"],
                    "amount": order["total_amount"] * 100,  # Convert to kobo
                    "reference": reference,
                    "currency": "NGN",
                    "metadata": {
                        "order_id": payment_data.order_id,
                        "buyer_id": user["user_id"]
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            
            # Update order with payment reference
            await db.orders.update_one(
                {"order_id": payment_data.order_id},
                {"$set": {"payment_reference": reference}}
            )
            
            # Create transaction record
            transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
            await db.payment_transactions.insert_one({
                "transaction_id": transaction_id,
                "order_id": payment_data.order_id,
                "buyer_id": user["user_id"],
                "seller_id": order["seller_id"],
                "amount": order["total_amount"],
                "payment_reference": reference,
                "payment_status": PaymentStatus.PENDING.value,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            
            return {
                "reference": reference,
                "authorization_url": result["data"]["authorization_url"],
                "access_code": result["data"]["access_code"],
                "message": "Payment initialized successfully"
            }
        except Exception as e:
            logger.error(f"Paystack error: {e}")
            raise HTTPException(status_code=400, detail="Failed to initialize payment")

@api_router.get("/payments/verify/{reference}")
async def verify_payment(request: Request, reference: str):
    """Verify Paystack payment"""
    user = await require_auth(request)
    
    if not PAYSTACK_SECRET_KEY:
        # Mock for development
        return {"status": "success", "message": "Payment verified (MOCK MODE)"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}
            )
            response.raise_for_status()
            result = response.json()
            
            if result["data"]["status"] == "success":
                # Update order payment status
                order = await db.orders.find_one({"payment_reference": reference}, {"_id": 0})
                if order:
                    await db.orders.update_one(
                        {"order_id": order["order_id"]},
                        {"$set": {
                            "payment_status": PaymentStatus.COMPLETED.value,
                            "status": OrderStatus.CONFIRMED.value,
                            "updated_at": datetime.now(timezone.utc)
                        }}
                    )
                    
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"payment_reference": reference},
                        {"$set": {
                            "payment_status": PaymentStatus.COMPLETED.value,
                            "paystack_response": result["data"],
                            "updated_at": datetime.now(timezone.utc)
                        }}
                    )
                
                return {"status": "success", "message": "Payment verified successfully"}
            else:
                return {"status": "failed", "message": "Payment verification failed"}
        except Exception as e:
            logger.error(f"Payment verification error: {e}")
            raise HTTPException(status_code=400, detail="Failed to verify payment")

@api_router.get("/payments/public-key")
async def get_paystack_public_key():
    """Get Paystack public key for frontend"""
    return {"public_key": PAYSTACK_PUBLIC_KEY or "MOCK_PUBLIC_KEY"}

# ============= MESSAGING ROUTES =============

@api_router.post("/messages/send")
async def send_message(request: Request, message_data: SendMessageRequest):
    """Send a message"""
    user = await require_auth(request)
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        "message_id": message_id,
        "sender_id": user["user_id"],
        "receiver_id": message_data.receiver_id,
        "order_id": message_data.order_id,
        "content": message_data.content,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.messages.insert_one(message)
    
    return {"message": "Message sent", "message_id": message_id}

@api_router.get("/messages/conversation/{other_user_id}")
async def get_conversation(request: Request, other_user_id: str):
    """Get conversation with another user"""
    user = await require_auth(request)
    
    messages_cursor = db.messages.find({
        "$or": [
            {"sender_id": user["user_id"], "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user["user_id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1)
    
    messages = await messages_cursor.to_list(length=500)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.get("/messages/unread-count")
async def get_unread_count(request: Request):
    """Get unread message count"""
    user = await require_auth(request)
    
    count = await db.messages.count_documents({
        "receiver_id": user["user_id"],
        "is_read": False
    })
    
    return {"unread_count": count}

# ============= REFERRAL ROUTES =============

@api_router.get("/referrals/my-code")
async def get_my_referral_code(request: Request):
    """Get my referral code and link"""
    user = await require_auth(request)
    
    # Generate referral link
    base_url = "https://ogas.ng"  # Update with actual domain
    referral_link = f"{base_url}?ref={user['referral_code']}"
    
    return {
        "referral_code": user["referral_code"],
        "referral_link": referral_link,
        "reward_amount": 1000 if user["role"] == "seller" else 500
    }

@api_router.get("/referrals/stats")
async def get_referral_stats(request: Request):
    """Get referral statistics"""
    user = await require_auth(request)
    
    # Get all referrals
    referrals_cursor = db.referrals.find({"referrer_id": user["user_id"]}, {"_id": 0})
    referrals = await referrals_cursor.to_list(length=1000)
    
    # Calculate stats
    total_referrals = len(referrals)
    pending_referrals = len([r for r in referrals if r["status"] == "pending"])
    completed_referrals = len([r for r in referrals if r["status"] == "completed"])
    total_earnings = sum(r["reward_amount"] for r in referrals if r["status"] == "completed")
    pending_earnings = sum(r["reward_amount"] for r in referrals if r["status"] == "pending"])
    
    return {
        "total_referrals": total_referrals,
        "pending_referrals": pending_referrals,
        "completed_referrals": completed_referrals,
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "referral_credits": user.get("referral_credits", 0)
    }

@api_router.get("/referrals/list")
async def get_my_referrals(request: Request):
    """Get list of my referrals"""
    user = await require_auth(request)
    
    # Get referrals with referee details
    referrals_cursor = db.referrals.find({"referrer_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    referrals = await referrals_cursor.to_list(length=100)
    
    # Enrich with referee details
    for referral in referrals:
        referee = await db.users.find_one({"user_id": referral["referee_id"]}, {"_id": 0})
        if referee:
            referral["referee_name"] = referee.get("name")
            referral["referee_email"] = referee.get("email")
            referral["referee_joined"] = referee.get("created_at")
    
    return {"referrals": referrals}

@api_router.post("/referrals/complete/{referee_id}")
async def complete_referral(referee_id: str):
    """Mark referral as completed (called after referee's first order)"""
    # This endpoint is called internally when a user completes their first order
    
    # Find pending referral for this referee
    referral = await db.referrals.find_one({
        "referee_id": referee_id,
        "status": "pending"
    }, {"_id": 0})
    
    if not referral:
        return {"message": "No pending referral found"}
    
    # Mark as completed
    await db.referrals.update_one(
        {"referral_id": referral["referral_id"]},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    
    # Credit referrer's account
    await db.users.update_one(
        {"user_id": referral["referrer_id"]},
        {"$inc": {"referral_credits": referral["reward_amount"]}}
    )
    
    return {
        "message": "Referral completed",
        "reward_amount": referral["reward_amount"],
        "referrer_id": referral["referrer_id"]
    }

@api_router.get("/referrals/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers (public)"""
    # Aggregate referrals by referrer
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": "$referrer_id",
            "total_referrals": {"$sum": 1},
            "total_earnings": {"$sum": "$reward_amount"}
        }},
        {"$sort": {"total_referrals": -1}},
        {"$limit": 10}
    ]
    
    leaderboard = await db.referrals.aggregate(pipeline).to_list(length=10)
    
    # Enrich with user details
    for entry in leaderboard:
        user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
        if user:
            entry["name"] = user.get("name")
            entry["role"] = user.get("role")
    
    return {"leaderboard": leaderboard}

# ============= GENERAL ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Welcome to OGas API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
