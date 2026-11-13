import { useRef, useState, useContext, useEffect } from 'react';
import { Box, Typography, Button, Divider, TextField } from '@mui/material';
import Header from '../../components/Header/Header';
import BottomNav from '../../components/BottomNav/BottomNav';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import FavoriteBorderOutlinedIcon2 from '@mui/icons-material/FavoriteBorderOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { customerProfileService } from '../../services/customerProfileService';
import { getCustomerOrderHistory, isOrderServiceUnavailable, normalizeOrder } from '../../services/orderApi';
import { hasCompleteProfile } from '../../utils/profileCompletion';
import './Profile.css';
import './ProfileReference.css';
import { formatIndianMobile, isValidIndianMobile } from '../../utils/phoneValidation';
import { validRegistrationName } from '../../utils/registrationValidation';
import { isValidImageUrl, normalizeImageUrl } from '../../utils/imageUrl.js';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, setUser, addresses, deleteAddress, setDefaultAddress, formatDateTime, formatCurrency, selectedLocation, wishlistItems = [], savedForLater = [] } = useContext(AppContext);
  const addressSectionRef = useRef(null);
  const [addressesExpanded, setAddressesExpanded] = useState(false);
  const toggleAddresses = () => {
    setAddressesExpanded((expanded) => !expanded);
    addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [isEditing, setIsEditing] = useState(Boolean(location.state?.completeProfile));
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth || '',
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const tokenCustomerId = () => {
    try {
      const token = sessionStorage.getItem('authToken') || '';
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.customerId || '';
    } catch {
      return '';
    }
  };

  const [feedback, setFeedback] = useState('');
  const [photoUrl, setPhotoUrl] = useState(user?.photo || '');
  const [nameError, setNameError] = useState('');
  const addAddressState = () => ({
    returnTo: location.state?.returnTo || '/profile',
    ...(selectedLocation ? { location: selectedLocation } : {}),
  });
  useEffect(() => {
    if (!sessionStorage.getItem('authToken')) return;
    customerProfileService.me().then((profile) => {
      setProfileData({ name: profile.name || '', phone: profile.phone || '', email: profile.email || '', gender: profile.gender || '', dateOfBirth: profile.dateOfBirth || '' });
      setUser((current) => ({ ...current, ...profile }));
    }).catch((error) => {
      if (![401, 403, 404].includes(error.status)) setFeedback(error.message);
    });
  }, [setUser]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    let ignore = false;
    const timer = window.setTimeout(() => {
      if (!ignore) {
        setOrdersLoading(true);
        setOrdersError('');
      }
    }, 0);
    Promise.resolve().then(() => getCustomerOrderHistory(tokenCustomerId() || user.id))
      .then((payload) => {
        if (!ignore) {
          const rows = Array.isArray(payload) ? payload : payload?.orders || payload?.content || [];
          setOrderTotal(payload?.totalElements ?? payload?.total ?? rows.length);
          setRecentOrders(rows.map(normalizeOrder).slice(0, 1));
        }
      })
      .catch((error) => {
        if (!ignore) {
          setRecentOrders([]);
          setOrdersError(isOrderServiceUnavailable(error) ? 'Order Service is unavailable.' : error.message);
        }
      })
      .finally(() => {
        if (!ignore) setOrdersLoading(false);
      });
    return () => { ignore = true; window.clearTimeout(timer); };
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!validRegistrationName(profileData.name)) {
      setNameError('Enter your full name with at least three letters. Numbers are not allowed.');
      document.getElementById('profile-full-name')?.focus();
      return;
    }
    setNameError('');
    if (!isValidIndianMobile(profileData.phone)) return setFeedback('Enter a valid 10-digit Indian mobile number.');
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) return setFeedback('Enter a valid email address.');
    try {
      const saved = await customerProfileService.save({ ...profileData, phone:formatIndianMobile(profileData.phone), photo: user?.photo || null });
      setProfileData(saved);
      setUser((current) => ({ ...current, ...saved }));
      setIsEditing(false);
      setFeedback(addresses.length ? 'Profile information updated successfully.' : 'Profile saved. Add a delivery address to complete your account.');
      if (location.state?.completeProfile && addresses.length) {
        navigate(location.state?.returnTo || '/checkout');
      }
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/intro');
  };

  const handlePhotoSave = async () => {
    const normalized = normalizeImageUrl(photoUrl);
    if (!normalized || !isValidImageUrl(normalized)) return setFeedback('Enter a valid image URL. Google Drive images must be shared with anyone who has the link.');
    try {
      const updatedUser = await customerProfileService.save({ name: user?.name, phone: user?.phone, email: user?.email, gender: user?.gender, dateOfBirth: user?.dateOfBirth, photo: normalized });
      setUser((current) => ({ ...current, ...updatedUser }));
      setPhotoUrl(normalized);
      setFeedback('Profile photo updated successfully.');
    } catch (error) { setFeedback(error.message); }
  };

  return (
    <Box className="profile-wrapper">
      <Header />
      
      <Box className="profile-content-scroll">
        <Box className="profile-layout">
          
          {/* LEFT SIDEBAR */}
          <Box className="profile-sidebar">
            <Box className="user-summary-card">
              <Box className="user-avatar-placeholder">{user?.photo ? <img src={user.photo} alt={`${profileData.name} profile`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <PersonOutlineOutlinedIcon />}</Box>
              <Box className="user-summary-info">
                <Typography className="user-name">{user?.name}</Typography>
                <Typography className="user-phone">{user?.phone}</Typography>
                <Typography className="user-email">{user?.email}</Typography>
              </Box>
              <Button className="edit-link" startIcon={<EditOutlinedIcon/>} onClick={() => {
                setProfileData({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', gender: user?.gender || '', dateOfBirth: user?.dateOfBirth || '' });
                setIsEditing(!isEditing);
              }} style={{ cursor: 'pointer' }}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </Box>

            <Box className="sidebar-menu">
              {[
                { icon: <PersonOutlineOutlinedIcon />, text: 'My Profile', path: '/profile' },
                { icon: <ShoppingBagOutlinedIcon />, text: 'Orders', path: '/orders' },
                { icon: <LocationOnOutlinedIcon />, text: 'Address', path: '/saved-addresses' },
                { icon: <PrivacyTipOutlinedIcon />, text: 'Privacy policy', path: '/privacy-policy' },
                { icon: <DescriptionOutlinedIcon />, text: 'Terms & Conditions', path: '/terms-conditions' },
                { icon: <HelpOutlineOutlinedIcon />, text: 'Help & Support', path: '/help-center' },
                { icon: <NotificationsNoneOutlinedIcon />, text: 'Notifications', path: '/notifications' },
                { icon: <DeleteOutlineOutlinedIcon />, text: 'Delete account', path: '/delete-account' },
                { icon: <FavoriteBorderOutlinedIcon />, text: 'Wishlist', path: '/wishlist' },
                { icon: <DescriptionOutlinedIcon />, text: 'Ratings & Reviews', path: '/reviews' },
                { icon: <DescriptionOutlinedIcon />, text: 'Rewards & Offers', path: '/rewards' },
                { icon: <DescriptionOutlinedIcon />, text: 'Language & Currency', path: '/settings/language' },
              ].map((item, index) => (
                <Box
                  key={index}
                  className={`sidebar-menu-item ${item.text === 'My Profile' ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={item.text === 'Address' ? addressesExpanded : undefined}
                  aria-controls={item.text === 'Address' ? 'profile-saved-addresses' : undefined}
                  onClick={() => item.text === 'Address' ? toggleAddresses() : item.path && navigate(item.path)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (item.text === 'Address') toggleAddresses();
                      else if (item.path) navigate(item.path);
                    }
                  }}
                  style={{ cursor: item.path ? 'pointer' : 'default' }}
                >
                  <Box className="menu-item-left">
                    {item.icon}
                    <Typography className="menu-item-text">{item.text}</Typography>
                  </Box>
                  <KeyboardArrowRightIcon className="menu-item-arrow" sx={item.text === 'Address' && addressesExpanded ? { transform: 'rotate(90deg)' } : undefined} />
                </Box>
              ))}
            </Box>

            <Box className="logout-button" onClick={handleLogout}>
              <LogoutOutlinedIcon className="logout-icon" />
              <Typography className="logout-text">Logout</Typography>
            </Box>
          </Box>

          {/* RIGHT CONTENT */}
          <Box className="profile-main-content">
            <Box className="profile-page-heading"><Box><Typography variant="h4">My Profile</Typography><Typography>Manage your account details, addresses, and preferences.</Typography></Box><Box className="profile-spice-art" aria-hidden="true"><img src="/catalog-images/catalog-ground-spices.png" alt=""/><img src="/catalog-images/catalog-blended-masalas.png" alt=""/></Box></Box>
            
            {/* Profile Information Section */}
            <Box className="content-section">
              {location.state?.completeProfile && <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eef8f3', border: '1px solid #a7d7c1', borderRadius: 1 }}><Typography sx={{ color: '#075F40', fontWeight: 700 }}>Complete your profile</Typography><Typography sx={{ color: '#52635b', fontSize: 13 }}>Add your personal details and a delivery address. You may browse without them, but they are required before ordering.</Typography></Box>}
              <Box className="section-header-row">
                <Typography className="section-title">Profile Information</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                  style={{ borderColor: '#075F40', color: '#075F40', textTransform: 'none', fontWeight: 700 }}
                >
                  {isEditing ? 'Save Changes' : 'Edit Profile'}
                </Button>
              </Box>
              <Divider className="section-divider" />
              {feedback && <Typography role="status" sx={{ color: '#b45309', mb: 2 }}>{feedback}</Typography>}
              {location.state?.completeProfile && hasCompleteProfile({ ...user, ...profileData }, addresses) && (
                <Button variant="contained" onClick={() => navigate(location.state?.returnTo || '/checkout')} sx={{ mb: 2, bgcolor: '#075F40', textTransform: 'none', fontWeight: 700 }}>
                  Continue to checkout
                </Button>
              )}
              
              <Box className="profile-info-grid">
                <Box className="profile-photo-area">
                  <Box className="large-avatar-placeholder">{user?.photo ? <img src={user.photo} alt={`${profileData.name} profile`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <CameraAltOutlinedIcon/>}</Box>
                  {isEditing && <TextField size="small" label="Photo URL" placeholder="Paste a shareable image link" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} helperText="Anyone with the link must be able to view the image." sx={{ mt: 1 }} />}
                  {isEditing && <Button variant="outlined" startIcon={<CameraAltOutlinedIcon />} className="change-photo-btn" onClick={handlePhotoSave}>Save Photo</Button>}
                  {!isEditing && <Typography className="add-photo-caption">Add Photo</Typography>}
                </Box>
                
                <Box className="profile-details-area">
                  <Box className="detail-row">
                    <Box className="detail-item">
                      <Typography className="detail-label">Full Name</Typography>
                      {isEditing ? (
                        <input
                          type="text"
                          id="profile-full-name"
                          aria-label="Full Name"
                          aria-invalid={Boolean(nameError)}
                          aria-describedby={nameError ? 'profile-name-error' : undefined}
                          maxLength={120}
                          value={profileData.name}
                          onChange={(e) => { setProfileData({ ...profileData, name: e.target.value }); setNameError(''); }}
                          onBlur={() => setNameError(validRegistrationName(profileData.name) ? '' : 'Enter your full name with at least three letters. Numbers are not allowed.')}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      ) : (
                        <Typography className="detail-value">{profileData.name}</Typography>
                      )}
                      {isEditing && nameError && <Typography id="profile-name-error" role="alert" variant="caption" color="error">{nameError}</Typography>}
                    </Box>
                    <Box className="detail-item">
                      <Typography className="detail-label">Mobile Number</Typography>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      ) : (
                        <Typography className="detail-value">{profileData.phone}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Box className="detail-row">
                    <Box className="detail-item">
                      <Typography className="detail-label">Email Address</Typography>
                      {isEditing ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      ) : (
                        <Typography className="detail-value">{profileData.email}</Typography>
                      )}
                    </Box>
                    <Box className="detail-item"><Typography className="detail-label">Gender</Typography>{isEditing ? <select value={profileData.gender} onChange={(e) => setProfileData({ ...profileData, gender:e.target.value })} style={{ padding:'6px 10px',borderRadius:6,border:'1px solid #cbd5e1' }}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select> : <Typography className="detail-value">{profileData.gender || 'Not specified'}</Typography>}</Box>
                  </Box>
                  <Box className="detail-row">
                    <Box className="detail-item">
                      <Typography className="detail-label">Member Since</Typography>
                      <Typography className="detail-value flex-align">
                        <CalendarMonthOutlinedIcon fontSize="small" sx={{ mr: 1, color: '#087b49' }} /> 
                        {user?.createdAt ? formatDateTime(user.createdAt, { dateStyle: 'medium' }) : 'Not available'}
                      </Typography>
                    </Box>
                    <Box className="detail-item"><Typography className="detail-label">Date of Birth</Typography>{isEditing ? <input type="date" value={profileData.dateOfBirth} onChange={(e) => setProfileData({ ...profileData,dateOfBirth:e.target.value })} style={{ padding:'6px 10px',borderRadius:6,border:'1px solid #cbd5e1' }} /> : <Typography className="detail-value">{profileData.dateOfBirth || 'Not specified'}</Typography>}</Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box className="profile-metrics">{[
              { label:'Total Orders', value:orderTotal, icon:<ShoppingBagOutlinedIcon/>, tone:'green' },
              { label:'Wishlist Items', value:wishlistItems.length, icon:<FavoriteBorderOutlinedIcon2/>, tone:'pink' },
              { label:'Saved Items', value:savedForLater.length, icon:<BookmarkBorderOutlinedIcon/>, tone:'blue' },
              { label:'Offers Used', value:Number(user?.offersUsed || 0), icon:<CardGiftcardOutlinedIcon/>, tone:'amber' },
            ].map((metric)=><Box className={`profile-metric ${metric.tone}`} key={metric.label}><Box>{metric.icon}</Box><section><strong>{metric.value}</strong><small>{metric.label}</small></section></Box>)}</Box>

            {/* Addresses Section */}
            <Box className="content-section" id="profile-saved-addresses" ref={addressSectionRef} sx={{ scrollMarginTop: '150px' }}>
              <Box className="section-header-row">
                <Typography className="section-title">Addresses</Typography>
                <Button size="small" variant="outlined" startIcon={<LocationOnOutlinedIcon />} onClick={() => navigate('/address-form', { state: addAddressState() })} sx={{ color: '#075F40', borderColor: '#075F40', textTransform: 'none', fontWeight: 700 }}>Add New Address</Button>
              </Box>
              <Divider className="section-divider" />
              
              {addresses.length === 0 ? <Box sx={{ py: 1 }}><Typography sx={{ color: '#64748b', mb: 1 }}>No saved addresses. Add your live location, house number and floor.</Typography><Button variant="outlined" onClick={() => navigate('/address-form', { state: addAddressState() })} sx={{ borderColor: '#075F40', color: '#075F40', textTransform: 'none' }}>Add delivery address</Button></Box> : (addressesExpanded ? addresses : addresses.slice(0, 1)).map((address) => <Box className="address-card" key={address.id}>
                <Box className="address-type">
                  <HomeOutlinedIcon fontSize="small" />
                  <Typography>{address.type}</Typography>
                </Box>
                <Typography className="address-text">
                  {address.address}
                </Typography>
                <Box className="address-actions">
                  {!address.isDefault && <Button className="action-btn" onClick={() => setDefaultAddress(address.id)}>Set as default</Button>}
                  <Button startIcon={<EditOutlinedIcon />} className="action-btn edit-btn" onClick={() => navigate('/address-form', { state: { editAddress: address } })}>Edit</Button>
                  <Button startIcon={<DeleteForeverOutlinedIcon />} className="action-btn remove-btn" onClick={() => deleteAddress(address.id)}>Remove</Button>
                </Box>
              </Box>)}
              {addresses.length > 1 && <Button onClick={toggleAddresses} aria-expanded={addressesExpanded} aria-controls="profile-saved-addresses">{addressesExpanded ? 'Show less' : `Show all addresses (${addresses.length})`}</Button>}
            </Box>

            {/* Recent Orders Section */}
            <Box className="content-section">
              <Box className="section-header-row">
                <Typography className="section-title">Recent Orders</Typography>
                <Typography className="view-all-link" role="button" tabIndex={0} onClick={() => navigate('/orders')}>View All Orders <KeyboardArrowRightIcon fontSize="small" /></Typography>
              </Box>
              <Divider className="section-divider" />
              
              {ordersLoading ? <Typography role="status" sx={{ color: '#64748b' }}>Loading recent orders...</Typography> : ordersError ? <Typography role="alert" sx={{ color: '#b45309' }}>{ordersError}</Typography> : recentOrders.length === 0 ? <Typography sx={{ color: '#64748b' }}>No recent orders.</Typography> : recentOrders.map((order) => <Box className="order-card" key={order.id} onClick={() => navigate(`/order-details/${encodeURIComponent(order.id)}`, { state: { orderId: order.id } })} style={{ cursor: 'pointer' }}>
                <Box className="order-product-info">
                  <Box className="order-image-placeholder">Img</Box>
                  <Box className="order-details">
                    <Typography className="order-title">{order.items?.[0]?.title || 'Order'}</Typography>
                    <Typography className="order-id">Order ID: {order.id}</Typography>
                    <Typography className="order-date">{formatDateTime(order.createdAt, { dateStyle: 'medium' })}</Typography>
                  </Box>
                </Box>
                <Box className="order-status-price">
                  <Typography className="status-pill delivered">{order.status}</Typography>
                  <Typography className="order-price">{formatCurrency(order.totalAmount)} <KeyboardArrowRightIcon fontSize="small" sx={{ ml: 1, color: '#666' }} /></Typography>
                </Box>
              </Box>)}
            </Box>

          </Box>
        </Box>
      </Box>

      <BottomNav />
    </Box>
  );
};

export default Profile;
