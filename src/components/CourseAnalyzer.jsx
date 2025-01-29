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
    IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { generateEmbedding, generateOverlapExplanation } from '../services/openai';
import ReactMarkdown from 'react-markdown';

const CourseAnalyzer = () => {
    const [courseDescription, setCourseDescription] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyzeCourse = async () => {
        setLoading(true);
        setError(null);
        try {
            const prompt = `
Du er en erfaren universitetsrådgiver og kvalitetsekspert med spesialkompetanse innen:
- Pedagogisk kvalitet og læringsdesign
- NOKUT's kvalitetsstandarder
- Constructive alignment
- Blooms taksonomi
- Bærekraft i høyere utdanning
- Studentsentrert læring

Analyser følgende kursbeskrivelse grundig og gi en omfattende kvalitetsanalyse:

${courseDescription}

Strukturer analysen slik:

### 1. OVERORDNET VURDERING
- Helhetlig kvalitetsvurdering
- Styrker og hovedutfordringer
- Samsvar med nasjonale standarder
- Tydelig målgruppe og nivå

### 2. LÆRINGSUTBYTTEBESKRIVELSER
- Analyse av verb mot Blooms taksonomi
- Balanse mellom kunnskaper, ferdigheter og generell kompetanse
- Målbarhet og vurderbarhet
- Nivåtilpasning og progresjon
- Konkrete forbedringsforslag

### 3. PEDAGOGISK KVALITET
- Constructive alignment (sammenheng mellom mål, aktiviteter og vurdering)
- Studentaktive læringsformer
- Vurderingsformer og tilbakemeldinger
- Arbeidslivsrelevans
- Forskningsbasering

### 4. BÆREKRAFT OG SAMFUNNSRELEVANS
- Kobling mot FNs bærekraftsmål
- Etikk og samfunnsansvar
- Tverrfaglighet og helhetsperspektiv
- Innovasjon og fremtidsperspektiv

### 5. SPRÅK OG KOMMUNIKASJON
- Klarspråk og presisjon
- Konsistent begrepsbruk
- Struktur og lesbarhet
- Målgruppeorientering

### 6. KONKRETE ANBEFALINGER
- Prioriterte forbedringspunkter
- Spesifikke omformuleringer
- Forslag til nye elementer
- Implementeringsråd

### OPPSUMMERING
Kort oppsummering av hovedfunn og viktigste anbefalinger.

NB: Dette er en automatisk analyse basert på beste praksis og gjeldende standarder. Den bør brukes som utgangspunkt for videre kvalitetsarbeid, ikke som en endelig vurdering.`;

            const completion = await generateEmbedding.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4-turbo-preview",
                temperature: 0.7,
                max_tokens: 2500
            });

            setAnalysis(completion.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing course:', error);
            setError('Kunne ikke analysere kursbeskrivelsen. Prøv igjen senere.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" component="h1">
                    Kvalitetsanalyse av Kursbeskrivelse
                </Typography>
                <Tooltip title="Lim inn kursbeskrivelsen du ønsker å analysere. Verktøyet vil gi en omfattende kvalitetsanalyse basert på beste praksis og gjeldende standarder.">
                    <IconButton>
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 3, mb: 3 }}>
                <TextField
                    fullWidth
                    multiline
                    rows={10}
                    label="Lim inn kursbeskrivelse her"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    variant="outlined"
                />

                <Button
                    variant="contained"
                    onClick={analyzeCourse}
                    disabled={loading || !courseDescription.trim()}
                    sx={{ mt: 2 }}
                >
                    {loading ? <CircularProgress size={24} /> : 'Start Kvalitetsanalyse'}
                </Button>
            </Paper>

            {analysis && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Analyseresultat
                    </Typography>
                    <Box sx={{
                        '& h3': {
                            color: 'primary.main',
                            mt: 3,
                            mb: 2
                        },
                        '& ul': {
                            pl: 3
                        }
                    }}>
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                    </Box>
                </Paper>
            )}

            <div className="viktig-notat">
                <h3>VIKTIG: Analysen skal være:</h3>
                <ul>
                    <li>Konkret og handlingsorientert</li>
                    <li>Basert på gjeldende standarder for høyere utdanning</li>
                    <li>Støttet av eksempler fra kursbeskrivelsen</li>
                </ul>
            </div>
        </Box>
    );
};

export default CourseAnalyzer;