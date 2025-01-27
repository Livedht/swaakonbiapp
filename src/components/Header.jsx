import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';

const Header = () => {
    return (
        <div>
            <Button
                component={Link}
                to="/global-search"
                color="inherit"
                sx={{ ml: 2 }}
            >
                Global Course Search
            </Button>
        </div>
    );
};

export default Header; 