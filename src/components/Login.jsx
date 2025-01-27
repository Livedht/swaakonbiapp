import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { supabase } from '../services/supabase';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Fjern eventuelle mellomrom og konverter til lowercase
            const cleanEmail = email.trim().toLowerCase();

            // Ikke prøv å endre æøå - Supabase skal håndtere UTF-8 tegn
            const { data, error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password
            });

            if (error) {
                console.error('Login error:', error);
                // Gi en mer brukervennlig feilmelding på norsk
                if (error.message.includes('Invalid login credentials')) {
                    setError('Feil e-post eller passord');
                } else if (error.message.includes('Invalid email')) {
                    setError('Ugyldig e-postformat');
                } else {
                    setError('Kunne ikke logge inn: ' + error.message);
                }
                return;
            }

            if (data?.user) {
                onLogin(data.user);
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('En uventet feil oppstod. Prøv igjen senere.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
                maxWidth: 400,
                mx: 'auto',
                mt: 4,
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: 3
            }}
        >
            <Typography variant="h5" component="h1" gutterBottom>
                Logg inn
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                label="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                type="email"
            />

            <TextField
                fullWidth
                label="Passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                type="password"
            />

            <Button
                fullWidth
                type="submit"
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
            >
                {loading ? 'Logger inn...' : 'Logg inn'}
            </Button>
        </Box>
    );
};

export default Login; 