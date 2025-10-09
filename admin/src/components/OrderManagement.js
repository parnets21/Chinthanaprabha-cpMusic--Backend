import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Badge,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  FilterList,
  Refresh,
  TrendingUp,
  ShoppingCart,
  LocalShipping,
  CheckCircle,
  Cancel,
  Person,
  School,
  Image as ImageIcon,
} from '@mui/icons-material';

const API_BASE_URL = 'http://localhost:5000/api';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState('');
  const [stats, setStats] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCustomerType) params.customerModel = filterCustomerType;

      const response = await axios.get(`${API_BASE_URL}/orders`, { params });
      setOrders(response.data.data);
    } catch (err) {
      setError('Failed to fetch orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/stats/overview`);
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filterStatus, filterCustomerType]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      await axios.put(`${API_BASE_URL}/orders/${orderId}`, { status: newStatus });
      await fetchOrders();
      await fetchStats();
      setEditDialogOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      setError('Failed to update order: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete order
  const deleteOrder = async (orderId) => {
    try {
      setUpdating(true);
      await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
      await fetchOrders();
      await fetchStats();
      setDeleteDialogOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      setError('Failed to delete order: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'warning';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing': return <ShoppingCart />;
      case 'shipped': return <LocalShipping />;
      case 'delivered': return <CheckCircle />;
      case 'cancelled': return <Cancel />;
      default: return <ShoppingCart />;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Order Management
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <TrendingUp color="primary" sx={{ mr: 2 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Orders
                      </Typography>
                      <Typography variant="h5">
                        {stats.totalOrders}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <TrendingUp color="success" sx={{ mr: 2 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Revenue
                      </Typography>
                      <Typography variant="h5">
                        {formatCurrency(stats.totalRevenue)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            {stats.statusBreakdown?.map((status) => (
              <Grid item xs={12} sm={6} md={3} key={status._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(status._id)}
                      <Box sx={{ ml: 2 }}>
                        <Typography color="textSecondary" gutterBottom>
                          {status._id.charAt(0).toUpperCase() + status._id.slice(1)}
                        </Typography>
                        <Typography variant="h5">
                          {status.count}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="shipped">Shipped</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Customer Type</InputLabel>
                  <Select
                    value={filterCustomerType}
                    label="Customer Type"
                    onChange={(e) => setFilterCustomerType(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Teacher">Teacher</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    setFilterStatus('');
                    setFilterCustomerType('');
                  }}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {order._id.slice(-8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {order.customerModel === 'User' ? (
                        <Person color="primary" sx={{ mr: 1 }} />
                      ) : (
                        <School color="secondary" sx={{ mr: 1 }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {order.customer?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {order.customerModel}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(order.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(order.status)}
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedOrder(order);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Update Status">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedOrder(order);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Order">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* View Order Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Customer Information</Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    {selectedOrder.customerModel === 'User' ? (
                      <Person color="primary" sx={{ mr: 1 }} />
                    ) : (
                      <School color="secondary" sx={{ mr: 1 }} />
                    )}
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedOrder.customer?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {selectedOrder.customerModel}
                      </Typography>
                      {selectedOrder.customer?.email && (
                        <Typography variant="body2">
                          {selectedOrder.customer.email}
                        </Typography>
                      )}
                      {selectedOrder.customer?.mobile && (
                        <Typography variant="body2">
                          {selectedOrder.customer.mobile}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2">
                    <strong>Address:</strong> {selectedOrder.address}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Order Information</Typography>
                  <Typography variant="body2">
                    <strong>Order ID:</strong> {selectedOrder._id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong>
                    <Chip
                      icon={getStatusIcon(selectedOrder.status)}
                      label={selectedOrder.status}
                      color={getStatusColor(selectedOrder.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {formatDate(selectedOrder.createdAt)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total:</strong> {formatCurrency(selectedOrder.total)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Order Items</Typography>
                  <List>
                    {selectedOrder.items.map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemAvatar>
                          {item.instrument?.image ? (
                            <Avatar
                              src={`${API_BASE_URL}/${item.instrument.image}`}
                              variant="rounded"
                            />
                          ) : (
                            <Avatar variant="rounded">
                              <ImageIcon />
                            </Avatar>
                          )}
                        </ListItemAvatar>
                        <ListItemText
                          primary={item.instrument?.name || 'Unknown Instrument'}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Quantity: {item.quantity} | Price: {formatCurrency(item.price)}
                              </Typography>
                              {item.instrument?.category && (
                                <Typography variant="caption" color="textSecondary">
                                  Category: {item.instrument.category.name}
                                  {item.instrument.subcategory && ` > ${item.instrument.subcategory.name}`}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Order ID: {selectedOrder._id.slice(-8)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Status: {selectedOrder.status}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={selectedOrder.status}
                  label="New Status"
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    status: e.target.value
                  })}
                >
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => updateOrderStatus(selectedOrder._id, selectedOrder.status)}
            variant="contained"
            disabled={updating}
          >
            {updating ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Order Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this order? This action cannot be undone.
          </Typography>
          {selectedOrder && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Order ID: {selectedOrder._id.slice(-8)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => deleteOrder(selectedOrder._id)}
            variant="contained"
            color="error"
            disabled={updating}
          >
            {updating ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderManagement; 