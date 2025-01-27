import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    CircularProgress,
    Grid,
    Alert,
    Card,
    CardContent,
    Divider,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import OpenAI from 'openai';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedIcon from '@mui/icons-material/Verified';
import NatureIcon from '@mui/icons-material/Nature';
import RecommendIcon from '@mui/icons-material/Recommend';

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

const getIconForSection = (sectionNumber) => {
    switch (sectionNumber) {
        case 1: return <FormatListBulletedIcon />;
        case 2: return <SchoolIcon />;
        case 3: return <VerifiedIcon />;
        case 4: return <NatureIcon />;
        case 5: return <RecommendIcon />;
        default: return null;
    }
};

const CourseAnalyzer = () => {
    const [courseDescription, setCourseDescription] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const analyzeCourse = async () => {
        setLoading(true);
        try {
            const prompt = `
Du er en erfaren universitetsrådgiver med ekspertise i kursbeskrivelser, pedagogikk og bærekraft. Analyser følgende kursbeskrivelse grundig.

Kursbeskrivelse:
${courseDescription}

Gi en omfattende analyse strukturert i følgende seksjoner:

1. KVALITET OG STRUKTUR
- Vurder klarhet og presisjon i språket
- Evaluer struktur og organisering
- Identifiser eventuelle uklare eller manglende elementer
- Foreslå konkrete forbedringer i formuleringer

2. LÆRINGSUTBYTTE (Bloom's Taxonomy)
- Analyser verbbruk mot Bloom's taxonomi
- Vurder progresjonsnivå (er det passende for nivået?)
- Sjekk balansen mellom kunnskaper, ferdigheter og generell kompetanse
- Foreslå alternative formuleringer der det trengs
- Er læringsutbyttene målbare og tydelige?

3. NOKUT-SAMSVAR
- Vurder samsvar med Nasjonalt kvalifikasjonsrammeverk
- Sjekk om alle påkrevde komponenter er dekket
- Er nivået konsistent med studienivået?
- Identifiser eventuelle mangler i forhold til NOKUT's krav

4. BÆREKRAFTSMÅL
- Identifiser hvilke av FNs bærekraftsmål kurset potensielt støtter
- Foreslå hvordan bærekraftsperspektivet kan styrkes
- Vurder om kurset bidrar til samfunnsansvar og etisk bevissthet

5. ANBEFALINGER
- Liste over prioriterte forbedringspunkter
- Konkrete forslag til omformuleringer
- Tips til styrking av beskrivelsen
- Forslag til ytterligere elementer som kan inkluderes

Avslutt analysen med:
"NB: Dette er en automatisk analyse basert på oppgitt kursbeskrivelse/utkast til kursbeskrivelse. Den kan ikke erstatte en grunding faglig vurdering. Analysen bør kun brukes som et utgangspunkt for videre arbeid med kursbeskrivelsen."

Svar strukturert og konkret med følgende formatering:
- Bruk ### for hovedoverskrifter (f.eks ### 1. KVALITET OG STRUKTUR)
- Bruk - for hovedpunkter
- Bruk   - (med to mellomrom før) for underpunkter
- Unngå bruk av ** eller andre markeringer
- Hold teksten ren og lettlest
`;

            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4-turbo-preview",
                temperature: 0.7,
                max_tokens: 1500
            });

            setAnalysis(completion.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing course:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    color: 'primary.main',
                    fontWeight: 'bold'
                }}>
                    <AssessmentIcon fontSize="large" />
                    Kursanalyse Verktøy
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                    Dette verktøyet analyserer kursbeskrivelser mot Bloom's taxonomy, NOKUT's krav og FNs bærekraftsmål.
                    Lim inn hele kursbeskrivelsen inkludert læringsutbytter for en omfattende analyse.
                </Alert>

                <TextField
                    fullWidth
                    label="Kursbeskrivelse"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    multiline
                    rows={10}
                    margin="normal"
                    placeholder="Lim inn hele kursbeskrivelsen her..."
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'background.paper',
                        }
                    }}
                />

                <Button
                    variant="contained"
                    onClick={analyzeCourse}
                    disabled={loading || !courseDescription.trim()}
                    sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 'bold'
                    }}
                    fullWidth
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CircularProgress size={24} color="inherit" />
                            Analyserer kursbeskrivelse...
                        </Box>
                    ) : (
                        'Analyser Kursbeskrivelse'
                    )}
                </Button>
            </Paper>

            {analysis && (
                <Paper sx={{ p: 4, borderRadius: 2 }}>
                    <Typography variant="h5" gutterBottom color="primary" sx={{ fontWeight: 'bold', mb: 3 }}>
                        Analyseresultat
                    </Typography>
                    <Grid container spacing={3}>
                        {analysis.split('###').filter(Boolean).map((section, index) => {
                            const [title, ...content] = section.trim().split('\n');
                            return (
                                <Grid item xs={12} key={index}>
                                    <Card sx={{
                                        mb: 2,
                                        boxShadow: 2,
                                        '&:hover': {
                                            boxShadow: 4,
                                            transform: 'translateY(-2px)',
                                            transition: 'all 0.3s ease-in-out'
                                        }
                                    }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                color: 'primary.main',
                                                fontWeight: 'bold'
                                            }}>
                                                {getIconForSection(index + 1)}
                                                {title.replace(/^\d+\.\s*/, '')}
                                            </Typography>
                                            <Divider sx={{ my: 2 }} />
                                            {content.map((line, i) => {
                                                if (!line.trim()) return null;

                                                const cleanedLine = line.replace(/\*\*/g, '');

                                                if (cleanedLine.startsWith('-')) {
                                                    const indentLevel = cleanedLine.match(/^-\s*/)[0].length - 1;

                                                    return (
                                                        <Typography
                                                            key={i}
                                                            variant="body1"
                                                            sx={{
                                                                ml: 2 + (indentLevel * 2),
                                                                mb: 1,
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                '&:before': {
                                                                    content: '"•"',
                                                                    marginRight: '8px',
                                                                    color: 'primary.main'
                                                                }
                                                            }}
                                                        >
                                                            {cleanedLine.replace(/^-\s*/, '')}
                                                        </Typography>
                                                    );
                                                }

                                                if (cleanedLine.startsWith('NB:')) {
                                                    return (
                                                        <Alert severity="info" sx={{ mt: 2 }}>
                                                            {cleanedLine}
                                                        </Alert>
                                                    );
                                                }

                                                return (
                                                    <Typography key={i} variant="body1" paragraph>
                                                        {cleanedLine}
                                                    </Typography>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default CourseAnalyzer; 