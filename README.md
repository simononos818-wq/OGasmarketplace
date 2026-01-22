# OGas - Cooking Gas Marketplace for Nigeria

OGas is a comprehensive marketplace platform connecting cooking gas sellers and buyers across Nigeria with secure payment integration.

## Features

### For Buyers
- **Distance-Based Search**: Find gas sellers near your location
- **Compare Prices**: View prices for different cylinder sizes (3kg, 6kg, 12.5kg, 25kg, 50kg)
- **Secure Payments**: Pay safely using Paystack integration
- **Order Tracking**: Track your orders from placement to delivery
- **Seller Reviews**: Read ratings and reviews from other customers
- **Multiple Delivery Options**: Choose between delivery or pickup

### For Sellers
- **Business Profile**: Create and manage your business profile with location
- **Gas Listings**: List your gas products with flexible pricing per cylinder size
- **Order Management**: View and manage incoming orders
- **Customer Communication**: Interact with buyers through the platform
- **Rating System**: Build your reputation through customer reviews

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Authentication**: Emergent Google OAuth
- **Payment**: Paystack (Nigerian payment gateway)

## Getting Started

### Prerequisites
- Node.js 16+ and Yarn
- Python 3.8+
- MongoDB
- Paystack API keys (for payment processing)

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
```

### Configuration

**Backend (.env in /app/backend/):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

**Frontend (.env in /app/frontend/):**
```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

### Running the Application

The application runs via supervisor:
```bash
sudo supervisorctl restart all
sudo supervisorctl status
```

- Backend runs on: http://localhost:8001
- Frontend runs on: http://localhost:3000

## API Documentation

### Authentication Endpoints
- `GET /api/auth/session` - Exchange session ID for user data
- `POST /api/auth/complete-signup` - Complete user registration with role selection
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout user

### Seller Endpoints
- `POST /api/sellers/profile` - Create/update seller profile
- `GET /api/sellers/my-profile` - Get seller profile
- `POST /api/sellers/listings` - Create/update gas listing
- `GET /api/sellers/my-listing` - Get seller's gas listing
- `GET /api/sellers/my-orders` - Get orders for seller
- `PATCH /api/sellers/orders/{order_id}/status` - Update order status

### Buyer Endpoints
- `GET /api/buyers/search-sellers` - Search sellers by distance
- `GET /api/buyers/seller/{seller_id}` - Get seller details with reviews
- `POST /api/buyers/orders` - Create new order
- `GET /api/buyers/my-orders` - Get buyer's orders
- `POST /api/buyers/reviews` - Create review for completed order

### Payment Endpoints
- `POST /api/payments/initialize` - Initialize Paystack payment
- `GET /api/payments/verify/{reference}` - Verify payment status
- `GET /api/payments/public-key` - Get Paystack public key

### Messaging Endpoints
- `POST /api/messages/send` - Send message
- `GET /api/messages/conversation/{other_user_id}` - Get conversation
- `GET /api/messages/unread-count` - Get unread message count

## User Flows

### Buyer Journey
1. Sign up with Google OAuth and select "Buyer" role
2. Optionally set location or use current location
3. Search for sellers within specified radius
4. Browse seller profiles and gas prices
5. Place order for desired cylinder size and quantity
6. Pay securely via Paystack
7. Track order status
8. Leave review after delivery

### Seller Journey
1. Sign up with Google OAuth and select "Seller" role
2. Complete business profile with location and operating hours
3. Create gas listing with prices for available cylinder sizes
4. Receive and confirm orders
5. Update order status (pending → confirmed → completed)
6. Build reputation through customer reviews

## Key Features Implementation

### Distance-Based Search
Uses Haversine formula to calculate distances between buyer and seller locations:
```python
def calculate_distance(lat1, lon1, lat2, lon2):
    # Returns distance in kilometers
```

### Payment Integration
Integrated with Paystack for secure Nigerian Naira (NGN) transactions:
- Supports multiple payment methods (cards, bank transfer, USSD)
- Amount handling in kobo (smallest currency unit)
- Webhook support for real-time payment notifications

### Authentication
Uses Emergent Google OAuth for hassle-free authentication:
- No password management required
- Secure session token storage
- Role-based access control (buyer/seller)

## Database Schema

### Collections
- `users` - User accounts with role and location
- `user_sessions` - Active session tokens
- `sellers` - Seller business profiles
- `gas_listings` - Gas product listings with prices
- `orders` - Order records
- `reviews` - Seller reviews and ratings
- `messages` - User-to-user messages
- `payment_transactions` - Payment records

## Development Notes

### Adding Paystack Keys
To enable real payment processing:
1. Sign up at [Paystack](https://paystack.com)
2. Get your API keys from Settings → API Keys & Webhooks
3. Add keys to backend `.env` file
4. Restart backend: `sudo supervisorctl restart backend`

### Testing
- Use Paystack test cards for development
- Test card: 4084084084084081, CVV: 408, Expiry: any future date
- See `/app/auth_testing.md` for authentication testing guide

## Security Considerations

- All API routes use `/api` prefix for proper routing through Kubernetes ingress
- Session tokens stored as httpOnly cookies
- Paystack secret keys kept server-side only
- MongoDB `_id` field excluded from all API responses
- Input validation using Pydantic models
- CORS configuration for production domains

## Future Enhancements

- Real-time chat using WebSockets
- Push notifications for order updates
- Advanced search filters (ratings, price range)
- Seller verification process
- Inventory management
- Analytics dashboard for sellers
- Multiple payment gateways (Flutterwave support)
- Mobile app (React Native)

## Support

For issues or questions, please refer to the system documentation or contact support.

---

**OGas - Making cooking gas accessible to all Nigerians** 🔥
