import { useContext, useEffect, useState } from 'react';
import { Badge, Box, IconButton, InputBase, Typography } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import AllInclusiveOutlinedIcon from '@mui/icons-material/AllInclusiveOutlined';
import RiceBowlOutlinedIcon from '@mui/icons-material/RiceBowlOutlined';
import SoupKitchenOutlinedIcon from '@mui/icons-material/SoupKitchenOutlined';
import TakeoutDiningOutlinedIcon from '@mui/icons-material/TakeoutDiningOutlined';
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined';
import GrainOutlinedIcon from '@mui/icons-material/GrainOutlined';

import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useAnimatedPlaceholder } from '../../hooks/useAnimatedPlaceholder';
import { getAllCustomerNotifications, normalizeNotification } from '../../services/notificationApi';
import logo from '../../assets/images/logo.png';
import mangoPickleImg from '../../assets/images/mango_pickle_jar.png';
import './HomeHeaderBanner.css';

const HomeHeaderBanner = () => {
  const navigate = useNavigate();
  const animatedPlaceholder = useAnimatedPlaceholder();
  const { userCity, selectedCategory, setSelectedCategory, homeSearchQuery, setHomeSearchQuery, cartCount, savedForLater, user, isLoggedIn } = useContext(AppContext);
  const [unreadNotifications, setUnreadNotifications] = useState({ userId: null, count: 0 });
  const unreadNotificationCount = isLoggedIn && user?.id && unreadNotifications.userId === user.id ? unreadNotifications.count : 0;
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return undefined;
    let active = true;
    const loadUnread = async () => {
      try {
        const rows = await getAllCustomerNotifications(user.id);
        if (active) setUnreadNotifications({ userId: user.id, count: rows.map(normalizeNotification).filter((item) => !item.read).length });
      } catch { if (active) setUnreadNotifications({ userId: user.id, count: 0 }); }
    };
    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isLoggedIn, user?.id]);

  const categories = [
    { name: 'All', icon: <AllInclusiveOutlinedIcon fontSize="small" /> },
    { name: 'Whole Masala', icon: <RiceBowlOutlinedIcon fontSize="small" /> },
    { name: 'Masalas', icon: <SoupKitchenOutlinedIcon fontSize="small" /> },
    { name: 'Pickles', icon: <TakeoutDiningOutlinedIcon fontSize="small" /> },
    { name: 'Spice powder', icon: <BakeryDiningOutlinedIcon fontSize="small" /> },
    { name: 'Dry Fruits', icon: <GrainOutlinedIcon fontSize="small" /> },
  ];

  return (
    <Box className="combined-green-banner-wrapper">
      {/* Top Main Navigation Header Row matching screenshot */}
      <Box className="banner-top-row">
        <Box className="banner-brand-left">
          <img src={logo} alt="pickles & more" className="banner-brand-logo" onClick={() => navigate('/home')} />
          <Box className="user-greeting-location">
            <Typography className="banner-user-name">Hi, Kalyan</Typography>
            <Box className="banner-location-selector" onClick={() => navigate('/address-map')}>
              <LocationOnOutlinedIcon style={{ fontSize: 15, color: '#e2e8f0' }} />
              <Typography className="banner-location-text">{userCity || 'Jubliee Hills, Hyderabad, Telangana'}</Typography>
              <KeyboardArrowDownIcon style={{ fontSize: 16, color: '#e2e8f0' }} />
            </Box>
          </Box>
        </Box>

        {/* Center Search Input */}
        <Box className="banner-search-bar">
          <InputBase
            placeholder={animatedPlaceholder}
            value={homeSearchQuery}
            onChange={(e) => setHomeSearchQuery(e.target.value)}
            className="banner-search-input"
          />
          {homeSearchQuery ? (
            <CloseIcon
              onClick={() => setHomeSearchQuery('')}
              style={{ color: '#64748b', fontSize: 18, cursor: 'pointer', marginLeft: 4 }}
            />
          ) : (
            <SearchIcon style={{ color: '#1e293b', fontSize: 20 }} />
          )}
        </Box>

        {/* Right Action Icons (Wishlist, Notifications, Cart) */}
        <Box className="banner-header-actions">
          <Box className="banner-action-item" onClick={() => navigate('/wishlist')}>
            <FavoriteBorderIcon style={{ fontSize: 22, color: '#ffffff' }} />
            <Typography className="banner-action-label">Wishlist</Typography>
          </Box>
          <Box className="banner-action-item" onClick={() => navigate('/saved-for-later')}>
            <Badge badgeContent={savedForLater.length} color="error" className="banner-cart-badge">
              <BookmarkBorderOutlinedIcon style={{ fontSize: 22, color: '#ffffff' }} />
            </Badge>
            <Typography className="banner-action-label">Saved</Typography>
          </Box>
          <Box className="banner-action-item">
            <IconButton aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`} onClick={() => navigate('/notifications')} sx={{ color:'#fff', p:.5 }}>
              <Badge badgeContent={unreadNotificationCount} color="error" className="banner-cart-badge"><NotificationsNoneOutlinedIcon style={{ fontSize: 22, color: '#ffffff' }} /></Badge>
            </IconButton>
            <Typography className="banner-action-label">Notifications</Typography>
          </Box>
          <Box className="banner-action-item" onClick={() => navigate('/cart')}>
            <Badge badgeContent={cartCount} color="error" className="banner-cart-badge">
              <ShoppingCartOutlinedIcon style={{ fontSize: 22, color: '#ffffff' }} />
            </Badge>
            <Typography className="banner-action-label">Cart</Typography>
          </Box>
        </Box>
      </Box>

      {/* Category Navigation Bar matching screenshot */}
      <Box className="banner-category-nav">
        {categories.map((cat, index) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <Box
              key={index}
              className={`banner-category-item ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              <Box className="category-icon-circle">{cat.icon}</Box>
              <Typography className="category-name-text">{cat.name}</Typography>
              {isSelected && <Box className="category-active-line" />}
            </Box>
          );
        })}
      </Box>

      {/* Hero Banner Section matching screenshot layout */}
      <Box className="banner-hero-card">
        <Box className="hero-text-side">
          <Typography className="hero-main-title">
            Authentic Pickles, Premium<br />Spices &amp; Traditional Flavours
          </Typography>

          <Typography className="hero-sub-text">
            Freshly prepared pickles and<br />handpicked spices from across India
          </Typography>
        </Box>

        <Box className="hero-image-side">
          <img src={mangoPickleImg} alt="Pickles & Spices Jar" className="hero-jar-img" />

          <Box className="trusted-badge-seal">
            <Typography className="trusted-word">TRUSTED BY</Typography>
            <Typography className="trusted-number">99</Typography>
            <Typography className="trusted-thousand">THOUSAND+</Typography>
            <Typography className="trusted-customers">CUSTOMERS</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomeHeaderBanner;
