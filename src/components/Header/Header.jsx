import { useContext, useEffect, useMemo, useState, useRef } from 'react';
import { Box, Typography, InputBase, Badge } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useAnimatedPlaceholder } from '../../hooks/useAnimatedPlaceholder';
import { useHomeNavigation } from '../../hooks/useHomeNavigation';
import { getAllCustomerNotifications, normalizeNotification } from '../../services/notificationApi';
import logo from '../../assets/images/logo.png';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const goHome = useHomeNavigation();
  const { pathname } = useLocation();
  const animatedPlaceholder = useAnimatedPlaceholder();
  const searchInputRef = useRef(null);
  const { isLoggedIn, user, cartCount, openCart, selectedLocation, homeSearchQuery, setHomeSearchQuery, catalogProducts, catalogStoreProducts, setSelectedProduct, t, locale, setShowLocationModal, savedForLater, wishlistItems } = useContext(AppContext);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const canReturnToAdmin = ['super-admin', 'global-admin', 'location-admin', 'store-manager'].includes(user?.role);
  const searchContainerRef = useRef(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const cleanLabel = (value) => String(value || '').split(',').map((part) => part.trim()).filter((part) => part && !/^undefined$/i.test(part) && !/^null$/i.test(part)).join(', ');
  const selectedLocationLabel = cleanLabel([selectedLocation?.title, selectedLocation?.city].filter((part, index, all) => part && all.indexOf(part) === index).join(', '))
    || cleanLabel(selectedLocation?.address);
  const selectedLocationTooltip = cleanLabel(selectedLocation?.address || [selectedLocation?.title, selectedLocation?.city].filter(Boolean).join(', '));
  const deliveryLabel = selectedLocationLabel || t('selectDeliveryLocation');
  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      setUnreadNotificationCount(0);
      return undefined;
    }
    let active = true;
    const loadUnread = async () => {
      try {
        const rows = await getAllCustomerNotifications(user.id);
        if (active) setUnreadNotificationCount(rows.map(normalizeNotification).filter((item) => !item.read).length);
      } catch { if (active) setUnreadNotificationCount(0); }
    };
    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isLoggedIn, user?.id]);
  const productSuggestions = useMemo(() => {
    const query = homeSearchQuery.trim().toLocaleLowerCase();
    if (query.length < 2) return [];

    const candidates = [
      ...(catalogProducts || []),
      ...(catalogStoreProducts || []).map((listing) => ({
        ...(listing.product || listing),
        storeId: listing.storeId || listing.product?.storeId,
        storeName: listing.storeName || listing.product?.storeName,
      })),
    ];
    const productsById = new Map();
    candidates.forEach((product) => {
      const id = product?.productId || product?.id;
      const name = product?.title || product?.name;
      if (!id || !name || product.active === false || String(product.status || '').toUpperCase() === 'INACTIVE') return;
      const key = String(id);
      if (!productsById.has(key)) productsById.set(key, { ...product, id: key, productId: key, title: name });
    });

    return [...productsById.values()]
      .filter((product) => [product.title, product.category, product.sku, product.brand]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query)))
      .sort((a, b) => Number(!a.title.toLocaleLowerCase().startsWith(query)) - Number(!b.title.toLocaleLowerCase().startsWith(query)))
      .slice(0, 5);
  }, [homeSearchQuery, catalogProducts, catalogStoreProducts]);

  useEffect(() => {
    const closeSuggestionsOutsideSearch = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', closeSuggestionsOutsideSearch);
    return () => document.removeEventListener('mousedown', closeSuggestionsOutsideSearch);
  }, []);

  useEffect(() => setActiveSuggestion(-1), [homeSearchQuery]);

  const selectSuggestion = (product) => {
    setHomeSearchQuery(product.title);
    setSelectedProduct(product);
    setSuggestionsOpen(false);
    navigate(`/product-info/${encodeURIComponent(product.productId || product.id)}`, { state: { product } });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' && productSuggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((index) => (index + 1) % productSuggestions.length);
      return;
    }
    if (event.key === 'ArrowUp' && productSuggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((index) => (index <= 0 ? productSuggestions.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Enter') {
      if (suggestionsOpen && productSuggestions[activeSuggestion]) {
        event.preventDefault();
        selectSuggestion(productSuggestions[activeSuggestion]);
      } else if (homeSearchQuery.trim() && window.location.pathname !== '/home') {
        navigate('/home');
      }
    }
  };

  const handleCartClick = () => {
    if (isLoggedIn) {
      navigate('/cart');
    } else {
      openCart();
    }
  };
  return (
    <Box className="header-container">
      <Box className="header-left">
        <img src={logo} alt="Pickles & Spices" className="header-logo" onClick={goHome} style={{ cursor: 'pointer' }} />
        
        {(
          <Box className="header-user-info">
            <Typography className="greeting">{isLoggedIn ? t('greeting', { name: user?.name || t('customer') }) : t('deliveryLocation')}</Typography>
            <Box component="button" className="delivery-location" title={selectedLocationTooltip} aria-label={`Change delivery location${selectedLocationTooltip ? `: ${selectedLocationTooltip}` : ''}`} onClick={() => { sessionStorage.setItem('locationPickerManualOpen', 'true'); setShowLocationModal(true); }} style={{ cursor: 'pointer', background: 'none', border: 0, textAlign: 'left' }}>
              <Typography className="deliver-to">{t('deliverTo')}: <span className="location" title={selectedLocationTooltip}>{deliveryLabel}</span></Typography>
              <KeyboardArrowDownIcon className="arrow-down" />
            </Box>
          </Box>
        )}
      </Box>

      <Box className="header-search" ref={searchContainerRef} sx={{ display: pathname.startsWith('/product') ? 'none' : undefined }}>
        <Box className="search-box" onClick={() => {
          searchInputRef.current?.focus();
        }}>
          <InputBase
            inputRef={searchInputRef}
            placeholder={locale.language === 'English' ? animatedPlaceholder : t('search')}
            className="search-input"
            value={homeSearchQuery}
            onChange={(e) => { setHomeSearchQuery(e.target.value); setSuggestionsOpen(true); }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={handleSearchKeyDown}
            inputProps={{ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': suggestionsOpen && productSuggestions.length > 0, 'aria-controls': 'header-product-suggestions' }}
          />
          {homeSearchQuery ? (
            <CloseIcon
              onClick={(event) => { event.stopPropagation(); setHomeSearchQuery(''); searchInputRef.current?.focus(); }}
              style={{ color: '#64748b', fontSize: 18, cursor: 'pointer', marginLeft: 4 }}
            />
          ) : (
            <SearchIcon className="search-icon" onClick={() => {
              if (window.location.pathname !== '/home') {
                navigate('/home');
                window.setTimeout(() => searchInputRef.current?.focus(), 0);
                return;
              }
              window.setTimeout(() => searchInputRef.current?.focus(), 0);
            }} />
          )}
        </Box>
        {suggestionsOpen && productSuggestions.length > 0 && (
          <Box className="product-suggestions" id="header-product-suggestions" role="listbox" aria-label="Product suggestions">
            {productSuggestions.map((product, index) => (
              <Box
                key={product.productId || product.id}
                component="button"
                type="button"
                className={`product-suggestion${index === activeSuggestion ? ' active' : ''}`}
                role="option"
                aria-selected={index === activeSuggestion}
                onMouseEnter={() => setActiveSuggestion(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(product)}
              >
                {product.image && <img src={product.image} alt="" className="product-suggestion-image" />}
                <span className="product-suggestion-copy">
                  <span className="product-suggestion-title">{product.title}</span>
                  <span className="product-suggestion-meta">{[product.category, product.weight, product.price ? `₹${product.price}` : ''].filter(Boolean).join(' · ')}</span>
                </span>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box className="header-right">
        {canReturnToAdmin && <Box className="action-item" role="button" tabIndex={0} title="Return to Admin Portal" aria-label="Return to Admin Portal" onClick={() => navigate('/admin/dashboard')} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('/admin/dashboard'); }
        }}>
          <AdminPanelSettingsOutlinedIcon className="action-icon" />
          <Typography className="action-text">Admin</Typography>
        </Box>}
        {/* Home header clock hidden as requested. */}
        <Box className="action-item" onClick={() => navigate('/settings/language')} title="Language, currency and time zone">
          <TranslateIcon className="action-icon" />
          <Typography className="action-text">{locale.language}</Typography>
        </Box>
        <Box className="action-item" role="button" tabIndex={0} aria-label={`${t('wishlist')}: ${wishlistItems.length} items`} onClick={() => navigate('/wishlist')} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('/wishlist'); }
        }}>
          <Badge badgeContent={wishlistItems.length} color="error" max={99} showZero className="cart-badge">
            <FavoriteBorderIcon className="action-icon" />
          </Badge>
          <Typography className="action-text">{t('wishlist')}</Typography>
        </Box>
        {isLoggedIn && <Box className="action-item" role="button" tabIndex={0} aria-label={`Notifications${unreadNotificationCount ? `: ${unreadNotificationCount} unread` : ''}`} onClick={() => navigate('/notifications')} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('/notifications'); }
        }}>
          <Badge badgeContent={unreadNotificationCount} color="success" max={99} className="cart-badge">
            <NotificationsNoneOutlinedIcon className="action-icon" />
          </Badge>
          <Typography className="action-text">Notifications</Typography>
        </Box>}
        {isLoggedIn ? (
          <>
            <Box className="action-item" onClick={() => navigate('/saved-for-later')}>
              <Badge badgeContent={savedForLater.length} color="success" className="cart-badge">
                <BookmarkBorderOutlinedIcon className="action-icon" />
              </Badge>
              <Typography className="action-text">{t('saved')}</Typography>
            </Box>
          </>
        ) : (
          <Box className="action-item" onClick={() => navigate('/intro')}>
            <PersonOutlineOutlinedIcon className="action-icon" />
            <Typography className="action-text">{t('login')}</Typography>
          </Box>
        )}
        <Box className="action-item" onClick={handleCartClick}>
          <Badge badgeContent={cartCount} color="success" className="cart-badge">
            <ShoppingCartOutlinedIcon className="action-icon" />
          </Badge>
          <Typography className="action-text">{t('cart')}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
