import { useContext } from 'react';
import { Box, Typography } from '@mui/material';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import BottomNav from '../../components/BottomNav/BottomNav';
import { AppContext } from '../../context/AppContext';
import './CategoriesPage.css';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const { setSelectedCategory, catalogCategories } = useContext(AppContext);

  const categoryList = catalogCategories.map((category) => ({
    id: category.id || category.slug || category.name,
    title: category.title || category.name || 'Category',
    subtitle: category.description || 'Authentic products curated for you.',
    mainImage: category.image || category.thumbnail || `/catalog-images/catalog-${String(category.slug || category.name || category.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    categoryKey: category.name || category.title || 'Category',
  }));

  const handleSubcategoryClick = (catKey) => {
    setSelectedCategory(catKey);
    navigate('/home');
  };

  return (
    <Box className="categories-page-container">
      <Header />
      <Box className="categories-content-scroll">
        <Box className="categories-title-banner"><Box className="categories-title-icon"><GridViewOutlinedIcon/></Box><Box><Typography className="all-categories-title">All Categories</Typography><Typography className="all-categories-subtitle">Explore our complete range of spices, masalas, pickles and more.</Typography></Box><Box className="categories-spice-art" aria-hidden="true"><img src="/catalog-images/catalog-ground-spices.png" alt=""/><img src="/catalog-images/catalog-blended-masalas.png" alt=""/><img src="/catalog-images/catalog-whole-spices.png" alt=""/></Box></Box>
        <Box className="categories-grid">
          {categoryList.map((cat) => <Box key={cat.id} component="button" className="category-tile" onClick={() => handleSubcategoryClick(cat.categoryKey)}>
            <Box className="category-tile-image"><img src={cat.mainImage} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = '/catalog-images/catalog-whole-spices.png'; }}/></Box>
            <Box className="category-tile-copy"><Typography className="category-item-title">{cat.title}</Typography><Typography className="category-item-subtitle">{cat.subtitle}</Typography></Box>
            <Box className="category-tile-arrow"><ArrowForwardOutlinedIcon/></Box>
          </Box>)}
        </Box>
      </Box>
      <BottomNav />
    </Box>
  );
};

export default CategoriesPage;
