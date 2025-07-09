import { createLazyFileRoute } from '@tanstack/react-router'
import React, { ReactElement } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    List,
    ListItem,
    // ListItemIcon, // Not using icons
    ListItemText,
    // useTheme, // Not strictly necessary for simple random colors
} from '@mui/material';
// No new icon imports needed

// Helper function to generate a random hex color (pure JS, no external library)
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

// Define the structure for a plan
interface Plan {
    id: number;
    title: string;
    name: string;
    features: string[];
}

function ProductPackages(): ReactElement {
    const plans: Plan[] = [
        {
            id: 1,
            title: 'GÓI 1',
            name: 'Free',
            features: ['1 Free Website', '1 Free Domain', '50 Emails/Day', '24*7 Uptime'],
        },
        {
            id: 2,
            title: 'GÓI 2',
            name: 'Basic',
            nameColor: getRandomColor(), // Assign random color directly here
            features: ['10 Free Website', '10 Free Domain', '2000 Emails/Day', '24*7 Uptime'],
        },
        {
            id: 3,
            title: 'GÓI 3',
            name: 'Business',
            nameColor: getRandomColor(), // Assign random color directly here
            features: ['Unlimited Websites', 'Unlimited Domains', 'Unlimited Emails/Day', '24*7 Uptime'],
        },
    ];

    return (
        <Box sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Grid container spacing={4} justifyContent="center">
                {plans.map((plan) => (
                    <Grid item key={plan.id} xs={12} sm={6} md={4}>
                        <Card
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 400, // Ensure consistent height for cards
                                borderRadius: 2, // Slightly rounded corners
                                boxShadow: 3, // Standard MUI shadow
                                borderLeft: `10px solid ${getRandomColor()}`, // Simple colored left border (the "tab")
                                transition: 'transform 0.3s ease-in-out',
                                '&:hover': {
                                    transform: 'translateY(-5px)', // Slight lift on hover
                                    boxShadow: 6, // Increase shadow on hover
                                },
                            }}
                        >
                            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, pb: 2 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ mb: 0.5 }}>
                                    {plan.title}
                                </Typography>
                                <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    {plan.name}
                                </Typography>
                                <List sx={{ width: '100%', mb: 3, px: 2 }}>
                                    {plan.features.map((feature, index) => (
                                        <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                                            {/* Using a simple Box for the bullet point */}
                                            <Box component="span" sx={{ mr: 1, color: 'primary.main' }}> {/* Use primary color for bullet */}
                                                •
                                            </Box>
                                            <ListItemText primary={feature} />
                                        </ListItem>
                                    ))}
                                </List>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    sx={{ mt: 'auto', width: '80%', py: 1.5, textTransform: 'uppercase', fontWeight: 'bold' }}
                                    onClick={() => console.log(`Adding ${plan.name} to cart!`)}
                                >
                                    Add to Cart
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export const Route = createLazyFileRoute('/product-package/')({
    component: ProductPackages,
});