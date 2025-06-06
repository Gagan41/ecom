import express from 'express';
import { 
  placeOrder, 
  placeOrderPhonePG, 
  verifyPhonePG, 
  allOrders, 
  userOrders, 
  updateStatus 
} from '../controllers/orderController.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js';

const orderRouter = express.Router();

// Admin Features
orderRouter.post('/list', adminAuth, allOrders);
orderRouter.post('/status', adminAuth, updateStatus);

// Payment Features
orderRouter.post('/place', authUser, placeOrder);
orderRouter.post('/phonepePG', authUser, placeOrderPhonePG);

// User Feature 
orderRouter.post('/userorders', authUser, userOrders);

// Verify payment (transaction ID is now expected as a URL parameter)
orderRouter.post('/verifyPhonePG/:merchantTransactionId', authUser, verifyPhonePG);

export default orderRouter;
