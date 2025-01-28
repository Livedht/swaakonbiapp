import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    CircularProgress,
    Paper,
    Alert,
    Tooltip,
    IconButton,
    Grid,
    Container,
    useTheme
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { generateCourseAnalysis } from '../services/openai';
import ReactMarkdown from 'react-markdown';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const ExpandableTextField = styled(TextField)(({ theme, multiline }) => ({
    '& .MuiInputBase-root': {
        resize: multiline ? 'vertical' : 'none',
        overflow: 'auto',
        minHeight: multiline ? '200px' : '56px',
        transition: 'all 0.2s ease',
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderRadius: '12px',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderColor: alpha(theme.palette.primary.main, 0.2)
        },
        '&.Mui-focused': {
            backgroundColor: '#fff',
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
        }
    },
    '& .MuiInputBase-input': {
        padding: theme.spacing(2),
        fontSize: '1rem',
        lineHeight: '1.6',
        color: theme.palette.text.primary
    },
    '& .MuiFormLabel-root': {
        fontSize: '1rem',
        fontWeight: 500,
        color: alpha(theme.palette.primary.main, 0.7),
        '&.Mui-focused': {
            color: theme.palette.primary.main
        }
    },
    '& .MuiFormHelperText-root': {
        marginTop: theme.spacing(1),
        fontSize: '0.875rem',
        color: theme.palette.text.secondary
    },
    '& .MuiInput-underline:before': {
        display: 'none'
    },
    '& .MuiInput-underline:after': {
        display: 'none'
    },
    '& .MuiOutlinedInput-notchedOutline': {
        display: 'none'
    }
}));

const StyledCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
    transition: 'all 0.2s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
}));

const CourseAnalyzer = () => {
    const theme = useTheme();
    const [courseDescription, setCourseDescription] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyzeCourse = async () => {
        setLoading(true);
        setError(null);
        try {
            const prompt = `Du er en erfaren norsk universitetsrådgiver og kvalitetsekspert som skal vurdere kvaliteten på en kursbeskrivelse.

KURSBESKRIVELSE SOM SKAL ANALYSERES:
${courseDescription}

Gi en grundig analyse strukturert slik:

### 1. OVERORDNET VURDERING (kort og presis)
- Styrker: Hva fungerer spesielt bra?
- Utfordringer: Hvilke elementer bør forbedres?
- Samsvar med NOKUTs standarder
- Er målgruppe og nivå tydelig kommunisert?

### 2. ANALYSE AV LÆRINGSUTBYTTEBESKRIVELSER
- Vurder verbbruk mot Blooms taksonomi (kognitive nivåer)
- Er det god balanse mellom:
  * Kunnskaper (faglig innhold)
  * Ferdigheter (hva studentene skal kunne gjøre)
  * Generell kompetanse (overførbare ferdigheter)
- Er læringsutbyttene:
  * Målbare og vurderbare?
  * Realistiske for nivået?
  * Tydelig formulert?

### 3. FAGLIG INNHOLD OG PENSUM
- Er innholdet oppdatert og relevant?
- Dekker pensum læringsutbyttene?
- Er omfanget av pensum tilpasset studiepoengen?
- Forslag til supplerende eller alternativ litteratur
- Vurdering av akademisk nivå og aktualitet

### 4. PEDAGOGISK KVALITET
- Constructive alignment: 
  * Sammenheng mellom læringsutbytte, aktiviteter og vurdering
  * Er vurderingsformene egnet?
- Studentaktivisering:
  * Hvilke læringsaktiviteter er planlagt?
  * Er de varierte og engasjerende?
- Tilbakemeldinger og vurdering:
  * Er vurderingsformene hensiktsmessige?
  * Er det lagt opp til formativ vurdering?

### 5. ARBEIDSLIVSRELEVANS
- Kobling mot arbeidslivets behov
- Forskningsbasering og faglig oppdatering
- Tverrfaglige perspektiver
- Relevans for nåværende og fremtidige arbeidsmarked

### 6. BÆREKRAFTSMÅL
- Identifiser hvilke av FNs bærekraftsmål kurset potensielt kan dekke
- For hvert relevant mål:
  * Beskriv hvordan kurset bidrar
  * Foreslå hvordan bidraget kan styrkes
- Forslag til ytterligere bærekraftsmål som kan integreres
- Vurder muligheter for tverrfaglig samarbeid rundt bærekraftsmålene

### 7. KONKRETE FORBEDRINGSFORSLAG
Prioriter 3-5 viktige forbedringspunkter med konkrete forslag til:
1. Omformuleringer av læringsutbytte
2. Justeringer i innhold/pensum
3. Forbedringer i vurderingsformer
4. Styrking av bærekraftsperspektiver
5. Andre kritiske endringer

### OPPSUMMERING
Kort oppsummering (maks 3 setninger) av hovedfunn og viktigste anbefalinger.

VIKTIG: Analysen skal være:
- Konkret og handlingsorientert
- Basert på gjeldende standarder for høyere utdanning
- Støttet av eksempler fra kursbeskrivelsen
- Konstruktiv i tone

NB: Dette er en automatisk analyse basert på beste praksis og gjeldende standarder. Den bør brukes som utgangspunkt for videre kvalitetsarbeid, ikke som en endelig vurdering.`;

            const response = await generateCourseAnalysis(prompt);
            setAnalysis(response);
        } catch (error) {
            console.error('Error analyzing course:', error);
            setError('Kunne ikke analysere kursbeskrivelsen. Prøv igjen senere.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <StyledCard>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        Kvalitetsanalyse av kursbeskrivelse
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        Lim inn kursbeskrivelsen for å få en detaljert kvalitetsanalyse
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        mt: 3,
                        mb: 2
                    }}>
                        {[
                            { text: 'Læringsutbytte', icon: '🎯' },
                            { text: 'Faglig innhold', icon: '📚' },
                            { text: 'Pedagogisk kvalitet', icon: '🎓' },
                            { text: 'Arbeidslivsrelevans', icon: '💼' },
                            { text: 'Bærekraftsmål', icon: '🌍' },
                            { text: 'Forbedringsforslag', icon: '✨' }
                        ].map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    padding: '4px 12px',
                                    borderRadius: '16px',
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                                }}
                            >
                                <Typography sx={{ fontSize: '1.2rem' }}>{item.icon}</Typography>
                                <Typography variant="body2" color="text.primary">
                                    {item.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <ExpandableTextField
                            fullWidth
                            multiline
                            minRows={8}
                            maxRows={20}
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            label="Kursbeskrivelse"
                            variant="standard"
                            required
                            placeholder="Lim inn kursbeskrivelsen her (læringsmål, kursinnhold, pensum, etc.)"
                            helperText="For best resultat, inkluder all relevant informasjon om kurset"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <AnimatedButton
                            fullWidth
                            variant="contained"
                            onClick={analyzeCourse}
                            disabled={loading || !courseDescription.trim()}
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Analyserer...' : 'Start kvalitetsanalyse'}
                        </AnimatedButton>
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                {analysis && (
                    <Box sx={{ mt: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                borderRadius: '12px'
                            }}
                        >
                            <ReactMarkdown
                                components={{
                                    h3: ({ children }) => (
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                color: 'primary.main',
                                                fontWeight: 600,
                                                mt: 3,
                                                mb: 2,
                                                '&:first-of-type': { mt: 0 }
                                            }}
                                        >
                                            {children}
                                        </Typography>
                                    ),
                                    p: ({ children }) => (
                                        <Typography
                                            variant="body1"
                                            sx={{ mb: 2, color: 'text.secondary' }}
                                        >
                                            {children}
                                        </Typography>
                                    ),
                                    li: ({ children }) => (
                                        <Typography
                                            component="li"
                                            sx={{
                                                mb: 1,
                                                pl: 2,
                                                position: 'relative',
                                                '&::before': {
                                                    content: '"•"',
                                                    position: 'absolute',
                                                    left: 0,
                                                    color: 'primary.main'
                                                }
                                            }}
                                        >
                                            {children}
                                        </Typography>
                                    )
                                }}
                            >
                                {analysis}
                            </ReactMarkdown>
                        </Paper>
                    </Box>
                )}
            </StyledCard>
        </Container>
    );
};

export default CourseAnalyzer; 