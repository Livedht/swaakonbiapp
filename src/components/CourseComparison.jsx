import React, { useState, useEffect, useCallback } from 'react';
import { fetchStoredEmbeddings } from '../services/supabase';
import { generateHFEmbedding, findSimilarCourses } from '../services/similarity';
import { alpha } from '@mui/material/styles';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Link,
    IconButton,
    TablePagination,
    InputAdornment,
    Collapse,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Chip,
    Checkbox,
    ListItemText,
} from '@mui/material';
import styled from '@emotion/styled';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Papa from 'papaparse';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { supabase, checkRateLimit, saveSearch } from '../services/supabase';
import { useSearch } from '../context/SearchContext';
import { generateCourseAnalysis, prepareCourseText } from '../services/similarity';

const MIN_INPUT_LENGTH = 10;
const MAX_INPUT_LENGTH = 5000;
const COLUMN_SETTINGS_KEY = 'courseComparisonColumns';

const defaultColumns = [
    { id: 'col-kurskode', label: 'Kurs', enabled: true, required: true },
    { id: 'col-similarity', label: 'Likhet', enabled: true, required: true },
    { id: 'col-credits', label: 'Studiepoeng', enabled: true },
    { id: 'col-level', label: 'Studienivå', enabled: true },
    { id: 'col-språk', label: 'Språk', enabled: true },
    { id: 'col-semester', label: 'Semester', enabled: true },
    { id: 'col-portfolio', label: 'Portfolio', enabled: false },
    { id: 'col-område', label: 'Område', enabled: false },
    { id: 'col-academic-coordinator', label: 'Koordinator', enabled: false },
    { id: 'col-institutt', label: 'Institutt', enabled: false },
    { id: 'col-ai', label: 'AI Analyse', enabled: true }
];

// Helper function to format credits
const formatCredits = (credits) => {
    if (!credits) return '';

    // Convert to string first to handle both string and number inputs
    const creditStr = credits.toString();

    // Handle special cases where we need to add a decimal point
    if (creditStr === '75') return '7.5';
    if (creditStr === '25') return '2.5';

    // For other cases, parse and format normally
    const numCredits = parseFloat(creditStr);
    if (isNaN(numCredits)) return creditStr;

    return `${numCredits}`;
};

const normalizeCredits = (credits) => {
    if (!credits) return null;

    // Konverter til string og fjern "SP" og whitespace
    const creditStr = String(credits).replace(/\s*SP\s*/i, '').trim();

    // Håndter spesielle tilfeller
    if (creditStr === '75') return '7.5';
    if (creditStr === '25') return '2.5';

    // Returner normalisert verdi
    return creditStr;
};

const validateInput = (text) => {
    if (!text || typeof text !== 'string') return false;
    const cleaned = text.trim();
    return cleaned.length >= MIN_INPUT_LENGTH && cleaned.length <= MAX_INPUT_LENGTH;
};

// Styled components
const StyledCard = styled(Paper)(({ theme }) => ({
    borderRadius: '16px',
    padding: theme.spacing(3),
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
        : 'linear-gradient(145deg, #ffffff, #f5f5f5)',
    boxShadow: theme.palette.mode === 'dark'
        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
        : '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease',
    '&:hover': {
        transform: 'translateY(-2px)'
    }
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
    borderRadius: '12px',
    padding: '12px 24px',
    transition: 'all 0.2s ease',
    fontWeight: 600,
    textTransform: 'none',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    '&.MuiTableCell-head': {
        backgroundColor: 'transparent',
        color: theme.palette.text.primary,
        fontWeight: 600,
        fontSize: '0.95rem',
        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
    },
    '&.MuiTableCell-body': {
        fontSize: '0.9rem',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
    }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        '& .row-explanation': {
            opacity: 1,
            height: 'auto',
            padding: theme.spacing(2)
        }
    }
}));

const RowExplanation = styled(Box)(({ theme }) => ({
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    backgroundColor: alpha(
        theme.palette.primary.main,
        theme.palette.mode === 'dark' ? 0.15 : 0.05
    ),
    borderRadius: theme.spacing(1),
    margin: theme.spacing(1, 3),
    padding: 0,
    '&.visible': {
        opacity: 1,
        height: 'auto',
        padding: theme.spacing(2)
    }
}));

const SimilarityBadge = styled(Box)(({ theme, similarity }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '20px',
    fontWeight: 600,
    fontSize: '0.85rem',
    backgroundColor: similarity >= 70
        ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.3 : 0.15)
        : similarity >= 60
            ? alpha(theme.palette.success.light, theme.palette.mode === 'dark' ? 0.15 : 0.07)
            : similarity >= 50
                ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)
                : alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
    color: theme.palette.mode === 'dark'
        ? similarity >= 70
            ? theme.palette.success.light
            : similarity >= 60
                ? alpha(theme.palette.success.light, 0.8)
                : similarity >= 50
                    ? theme.palette.warning.light
                    : theme.palette.error.light
        : similarity >= 70
            ? theme.palette.success.dark
            : similarity >= 60
                ? alpha(theme.palette.success.dark, 0.7)
                : similarity >= 50
                    ? theme.palette.warning.dark
                    : theme.palette.error.dark
}));

const ErrorDisplay = ({ error, onRetry }) => (
    <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="error" gutterBottom>
            {error}
        </Typography>
        <Button onClick={onRetry} variant="contained" sx={{ mt: 2 }}>
            Prøv igjen
        </Button>
    </Box>
);

const ColumnListItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
        backgroundColor: theme.palette.action.hover
    }
}));

const FilterSection = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
}));

const getFilterLabel = (field) => {
    const labels = {
        studyLevel: 'Studienivå',
        language: 'Språk',
        credits: 'Studiepoeng',
        semester: 'Semester',
        portfolio: 'Portfolio',
        område: 'Område',
        academic_coordinator: 'Koordinator',
        institutt: 'Institutt'
    };
    return labels[field] || field;
};

const initialFilters = {
    similarityRange: [0, 100],
    studyLevel: {},
    language: {},
    credits: {},
    semester: {},
    portfolio: {},
    område: {},
    academic_coordinator: {},
    institutt: {}
};

const FilterBar = ({ filters, setFilters, results }) => {
    const getUniqueValues = useCallback((fieldName) => {
        if (!results) return [];

        let values = results
            .map(course => {
                // Spesialhåndtering for credits
                if (fieldName === 'credits') {
                    return normalizeCredits(course[fieldName]);
                }
                return course[fieldName];
            })
            .filter(Boolean)
            .sort((a, b) => {
                // Sorter credits numerisk
                if (fieldName === 'credits') {
                    return parseFloat(a) - parseFloat(b);
                }
                // Standard string sortering for andre felt
                return a.localeCompare(b);
            });

        // Fjern duplikater
        values = [...new Set(values)];

        // Formater credits for visning - fjernet "SP"
        if (fieldName === 'credits') {
            values = values.map(v => `${v}`);  // Fjernet " SP" her
        }

        return values;
    }, [results]);

    const uniqueValues = {
        studyLevel: getUniqueValues('level_of_study'),
        language: getUniqueValues('språk'),
        credits: getUniqueValues('credits'),
        semester: getUniqueValues('semester'),
        portfolio: getUniqueValues('portfolio'),
        område: getUniqueValues('ansvarlig_område'),
        academic_coordinator: getUniqueValues('academic_coordinator'),
        institutt: getUniqueValues('ansvarlig_institutt')
    };

    const handleFilterChange = (field, values) => {
        const newFilters = { ...filters };  // Copy existing filters

        if (field === 'similarityRange') {
            newFilters.similarityRange = values;
        } else {
            // Create a new object for the field's filters
            const fieldFilters = {};
            // Set all values to false first
            uniqueValues[field].forEach(value => {
                fieldFilters[value] = false;
            });
            // Then set selected values to true
            values.forEach(value => {
                fieldFilters[value] = true;
            });
            newFilters[field] = fieldFilters;
        }

        setFilters(newFilters);
    };

    // Add a function to count active filters
    const getActiveFilterCount = () => {
        return Object.entries(filters).reduce((count, [key, value]) => {
            if (key === 'similarityRange') {
                return count + (value[0] > 0 || value[1] < 100 ? 1 : 0);
            }
            return count + Object.values(value).filter(Boolean).length;
        }, 0);
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
    };

    const activeFilterCount = getActiveFilterCount();

    return (
        <FilterSection>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterAltIcon />
                    Aktive filtre
                    {activeFilterCount > 0 && (
                        <Chip label={activeFilterCount} size="small" color="primary" />
                    )}
                </Typography>
                {activeFilterCount > 0 && (
                    <Button
                        startIcon={<ClearIcon />}
                        onClick={handleClearFilters}
                        size="small"
                    >
                        Nullstill filtre
                    </Button>
                )}
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography gutterBottom>
                        Likhet: {filters.similarityRange[0]}% - {filters.similarityRange[1]}%
                    </Typography>
                    <Slider
                        value={filters.similarityRange}
                        onChange={(e, newValue) => handleFilterChange('similarityRange', newValue)}
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                    />
                </Grid>

                {Object.entries(uniqueValues).map(([field, values]) => (
                    <Grid item xs={12} sm={6} md={4} key={field}>
                        <FormControl fullWidth>
                            <InputLabel>{getFilterLabel(field)}</InputLabel>
                            <Select
                                multiple
                                value={Object.entries(filters[field] || {})
                                    .filter(([_, selected]) => selected === true)
                                    .map(([value]) => value)}
                                onChange={(e) => handleFilterChange(field, e.target.value)}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={value} size="small" />
                                        ))}
                                    </Box>
                                )}
                            >
                                {values.map((value) => (
                                    <MenuItem key={value} value={value}>
                                        <Checkbox
                                            checked={Boolean(filters[field]?.[value])}
                                        />
                                        <ListItemText primary={value} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                ))}
            </Grid>
        </FilterSection>
    );
};

const CourseComparison = ({ restoredSearch, onSearchComplete }) => {
    const { searchState, updateSearchState } = useSearch();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingExplanations, setLoadingExplanations] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedExplanations, setExpandedExplanations] = useState({});
    const [showColumnDialog, setShowColumnDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Use values from context
    const { formData, results, showForm, filters = initialFilters, availableColumns } = searchState;

    // Update context when form data changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        updateSearchState({
            formData: {
                ...formData,
                [name]: value
            }
        });
    };

    // Update context when filters change
    const handleFilterChange = (newFilters) => {
        updateSearchState({
            filters: newFilters
        });
    };

    // Effect for handling restored search
    useEffect(() => {
        if (restoredSearch) {
            updateSearchState({
                formData: restoredSearch.search_input,
                results: restoredSearch.results,
                showForm: false,
                filters: restoredSearch.table_settings?.filters || filters,
                availableColumns: restoredSearch.table_settings?.activeColumns ?
                    availableColumns.map(col => ({
                        ...col,
                        enabled: restoredSearch.table_settings.activeColumns.includes(col.id)
                    })) :
                    availableColumns
            });
            onSearchComplete();
        }
    }, [restoredSearch, onSearchComplete, filters, availableColumns, updateSearchState]);

    const handleCompare = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Check rate limit before making the request
            await checkRateLimit(user.id);

            // Validate inputs
            if (!validateInput(formData.courseName)) {
                throw new Error('Course name must be between 10 and 5000 characters');
            }
            if (!validateInput(formData.courseDescription)) {
                throw new Error('Course description must be between 10 and 5000 characters');
            }
            if (formData.courseLiterature && !validateInput(formData.courseLiterature)) {
                throw new Error('Course literature must be between 10 and 5000 characters if provided');
            }

            // Combine course information for embedding
            const courseText = {
                kursnavn: formData.courseName.trim(),
                kurskode: '',  // We don't have a course code for new courses
                learning_outcome_knowledge: formData.courseDescription.trim(),
                course_content: formData.courseDescription.trim(),
                literature: formData.courseLiterature?.trim() || ''
            };

            console.log('Generating embeddings...');
            let embedding;
            try {
                const preparedText = prepareCourseText(courseText);
                console.log('Prepared text:', preparedText);
                // Try with local inference first
                embedding = await generateHFEmbedding(preparedText, true);
                console.log('Generated embedding:', { length: embedding.length, sample: embedding.slice(0, 5) });
            } catch (localError) {
                console.error('Local inference failed:', localError);
                setError('Failed to generate embeddings. Please try again or contact support if the issue persists.');
                return;
            }

            console.log('Fetching stored courses...');
            const storedCourses = await fetchStoredEmbeddings();

            if (!storedCourses || storedCourses.length === 0) {
                throw new Error('No stored courses found to compare against');
            }

            console.log('Finding similar courses...');
            const similarCourses = await findSimilarCourses({ embedding }, storedCourses);

            if (similarCourses.length === 0) {
                updateSearchState({ results: [] });
                throw new Error('No similar courses found. Try providing more detailed course information.');
            }

            // Update both context and local state
            updateSearchState({
                results: similarCourses,
                showForm: false
            });

            // Save search to history
            await saveSearch({
                search_input: formData,
                table_settings: {
                    activeColumns: availableColumns.filter(col => col.enabled).map(col => col.id),
                    filters: filters,
                    sortOrder: null
                },
                results: similarCourses
            });

        } catch (error) {
            setError(error.message);
            console.error('Comparison error:', error);
        } finally {
            setLoading(false);
        }
    }, [formData, filters, availableColumns, updateSearchState]);

    // Toggle form visibility
    const toggleForm = () => {
        updateSearchState({ showForm: !showForm });
    };

    const getFilteredResults = useCallback(() => {
        if (!results) return [];

        // Sikre at vi har gyldig filters objekt
        const safeFilters = {
            ...initialFilters,
            ...filters
        };

        return results.filter(course => {
            // Search term filter
            const searchLower = searchTerm.toLowerCase().trim();
            if (searchLower !== '') {
                const searchableFields = [
                    course.kurskode,
                    course.kursnavn,
                    course.level_of_study,
                    course.språk,
                    course.academic_coordinator,
                    course.ansvarlig_institutt,
                    course.ansvarlig_område,
                    course.course_content,
                    course.learning_outcome_knowledge
                ].filter(Boolean);

                if (!searchableFields.some(field =>
                    String(field).toLowerCase().includes(searchLower)
                )) {
                    return false;
                }
            }

            // Sikre at similarityRange eksisterer og er et array
            const similarityRange = Array.isArray(safeFilters.similarityRange)
                ? safeFilters.similarityRange
                : [0, 100];

            // Similarity range filter
            if (course.similarity < similarityRange[0] ||
                course.similarity > similarityRange[1]) {
                return false;
            }

            // Check all other filters
            const filterFields = {
                studyLevel: 'level_of_study',
                language: 'språk',
                credits: 'credits',
                semester: 'semester',
                portfolio: 'portfolio',
                område: 'ansvarlig_område',
                academic_coordinator: 'academic_coordinator',
                institutt: 'ansvarlig_institutt'
            };

            return Object.entries(filterFields).every(([filterKey, courseField]) => {
                const activeFilters = Object.entries(safeFilters[filterKey] || {})
                    .filter(([_, selected]) => selected === true)
                    .map(([value]) => value);

                if (activeFilters.length === 0) return true;

                if (courseField === 'credits') {
                    const normalizedCourseCredits = normalizeCredits(course[courseField]);
                    const normalizedActiveFilters = activeFilters.map(f => normalizeCredits(f));
                    return normalizedCourseCredits && normalizedActiveFilters.includes(normalizedCourseCredits);
                }

                return course[courseField] && activeFilters.includes(course[courseField]);
            });
        });
    }, [results, searchTerm, filters]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const toggleExplanation = (course) => {
        if (course.explanation) {
            // If explanation exists, just toggle visibility
            setExpandedExplanations(prev => ({
                ...prev,
                [course.kurskode]: !prev[course.kurskode]
            }));
        } else {
            // If no explanation exists, generate one
            handleGenerateExplanation(course, formData.courseDescription);
            setExpandedExplanations(prev => ({
                ...prev,
                [course.kurskode]: true
            }));
        }
    };

    useEffect(() => {
        localStorage.setItem(COLUMN_SETTINGS_KEY, JSON.stringify(availableColumns));
    }, [availableColumns]);

    const handleGenerateExplanation = async (course, courseText) => {
        setLoadingExplanations(prev => ({ ...prev, [course.kurskode]: true }));

        try {
            const explanation = await generateCourseAnalysis(
                {
                    name: formData.courseName,
                    content: courseText,
                },
                course,
                course.similarity
            );

            if (!explanation || typeof explanation !== 'string') {
                throw new Error('Invalid explanation format received');
            }

            // Update results in context
            updateSearchState({
                results: searchState.results.map(r =>
                    r.kurskode === course.kurskode
                        ? { ...r, explanation }
                        : r
                )
            });
        } catch (err) {
            console.error('Error generating explanation:', err);
            setError(`Failed to generate explanation for ${course.kurskode}: ${err.message}`);
        } finally {
            setLoadingExplanations(prev => ({ ...prev, [course.kurskode]: false }));
        }
    };

    const exportResults = () => {
        if (!results || results.length === 0) return;

        // Få alle aktive kolonner
        const activeColumns = availableColumns.filter(col => col.enabled);

        // Lag CSV-innhold basert på aktive kolonner
        const csvContent = getFilteredResults().map(course => {
            const row = {};
            activeColumns.forEach(col => {
                switch (col.id) {
                    case 'col-kurskode':
                        row['Kurs'] = course.kurskode;
                        row['Kursnavn'] = course.kursnavn?.replace('No', '');
                        row['Lenke'] = course.språk === 'Engelsk' ? course.link_en : course.link_nb;
                        break;
                    case 'col-similarity':
                        row['Likhet'] = `${course.similarity}%`;
                        break;
                    case 'col-credits':
                        row['Studiepoeng'] = formatCredits(course.credits);
                        break;
                    case 'col-level':
                        row['Studienivå'] = course.level_of_study;
                        break;
                    case 'col-språk':
                        row['Språk'] = course.språk;
                        break;
                    case 'col-semester':
                        row['Semester'] = course.semester;
                        break;
                    case 'col-portfolio':
                        row['Portfolio'] = course.portfolio;
                        break;
                    case 'col-område':
                        row['Område'] = course.ansvarlig_område;
                        break;
                    case 'col-academic-coordinator':
                        row['Koordinator'] = course.academic_coordinator;
                        break;
                    case 'col-institutt':
                        row['Institutt'] = course.ansvarlig_institutt;
                        break;
                    case 'col-ai':
                        row['AI Analyse'] = course.explanation || '';
                        break;
                    default:
                        break;
                }
            });
            return row;
        });

        const csv = Papa.unparse(csvContent);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.download = `kursanalyse_resultater_${date}.csv`;
        link.click();
    };

    const moveColumn = (index, direction) => {
        const newColumns = [...availableColumns];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newColumns.length) {
            [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
            updateSearchState({ availableColumns: newColumns });
            localStorage.setItem(COLUMN_SETTINGS_KEY, JSON.stringify(newColumns));
        }
    };

    const resetColumnSettings = () => {
        updateSearchState({ availableColumns: defaultColumns });
        localStorage.setItem(COLUMN_SETTINGS_KEY, JSON.stringify(defaultColumns));
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Logo og Hero Section */}
            <Box sx={{
                textAlign: 'center',
                mb: 4,
                background: theme => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                    : 'linear-gradient(135deg, #f6f9fe 0%, #f1f4f9 100%)',
                borderRadius: '24px',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
            }}>
                <AnimatedButton
                    variant="contained"
                    onClick={toggleForm}
                    startIcon={showForm ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    disabled={loading}
                >
                    {loading ? 'Analyserer...' : (showForm ? 'Skjul analyseskjema' : 'Start ny analyse')}
                </AnimatedButton>
            </Box>

            {/* Analysis Form */}
            <Collapse in={showForm}>
                <StyledCard sx={{ mb: 4 }}>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleCompare();
                    }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="courseName"
                                    label="Course Name"
                                    value={formData.courseName}
                                    onChange={handleInputChange}
                                    required
                                    variant="filled"
                                    InputProps={{
                                        sx: {
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(0,0,0,0.02)'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="courseDescription"
                                    label="Course Description"
                                    value={formData.courseDescription}
                                    onChange={handleInputChange}
                                    required
                                    multiline
                                    rows={4}
                                    variant="filled"
                                    InputProps={{
                                        sx: {
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(0,0,0,0.02)'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="courseLiterature"
                                    label="Course Literature (Optional)"
                                    value={formData.courseLiterature}
                                    onChange={handleInputChange}
                                    multiline
                                    rows={3}
                                    variant="filled"
                                    InputProps={{
                                        sx: {
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(0,0,0,0.02)'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <AnimatedButton
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    fullWidth
                                >
                                    {loading ? (
                                        <CircularProgress size={24} sx={{ mr: 1 }} />
                                    ) : (
                                        <SearchIcon sx={{ mr: 1 }} />
                                    )}
                                    Analyze Course Overlap
                                </AnimatedButton>
                            </Grid>
                        </Grid>
                    </form>
                </StyledCard>
            </Collapse>

            {error && (
                <ErrorDisplay error={error.message} onRetry={() => {
                    setError(null);
                    updateSearchState({ results: null });
                    setLoading(true);
                }} />
            )}

            {results && (
                <StyledCard>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Søk i alle felt..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setSearchTerm('')}
                                                aria-label="clear search"
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(0,0,0,0.02)'
                                    }
                                }}
                            />
                            <AnimatedButton
                                variant="outlined"
                                onClick={() => setShowFilters(!showFilters)}
                                startIcon={<FilterListIcon />}
                            >
                                Filters
                            </AnimatedButton>
                            <AnimatedButton
                                variant="outlined"
                                onClick={exportResults}
                                startIcon={<FileDownloadIcon />}
                                disabled={!results || results.length === 0}
                            >
                                Eksporter til Excel
                            </AnimatedButton>
                        </Box>
                        <Button
                            startIcon={<SettingsIcon />}
                            onClick={() => setShowColumnDialog(true)}
                        >
                            Tilpass kolonner
                        </Button>
                    </Box>

                    {/* Search and Filters */}
                    <Collapse in={showFilters}>
                        <FilterBar
                            filters={filters}
                            setFilters={handleFilterChange}
                            results={results}
                        />
                    </Collapse>

                    {/* Results Table */}
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {availableColumns
                                        .filter(col => col.enabled)
                                        .map(col => (
                                            <StyledTableCell key={col.id}>
                                                {col.label}
                                            </StyledTableCell>
                                        ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getFilteredResults()
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((course) => {
                                        // Add debug logging
                                        console.log('Rendering course:', {
                                            kurskode: course.kurskode,
                                            credits: course.credits,
                                            level_of_study: course.level_of_study,
                                            språk: course.språk,
                                            semester: course.semester
                                        });
                                        return (
                                            <React.Fragment key={course.kurskode}>
                                                <StyledTableRow>
                                                    {availableColumns
                                                        .filter(col => col.enabled)
                                                        .map(col => (
                                                            <StyledTableCell key={col.id}>
                                                                {col.id === 'col-kurskode' && (
                                                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <Link
                                                                            href={course.språk === 'Engelsk' ? course.link_en : course.link_nb}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => {
                                                                                const selectedLink = course.språk === 'Engelsk' ? course.link_en : course.link_nb;
                                                                                console.log('Course link data:', {
                                                                                    kurskode: course.kurskode,
                                                                                    språk: course.språk,
                                                                                    link_nb: course.link_nb,
                                                                                    link_en: course.link_en,
                                                                                    selectedLink
                                                                                });
                                                                                if (!selectedLink) {
                                                                                    e.preventDefault();
                                                                                    console.error('No link available for course:', course.kurskode);
                                                                                }
                                                                            }}
                                                                            sx={{
                                                                                color: 'primary.main',
                                                                                textDecoration: 'none',
                                                                                fontWeight: 600,
                                                                                '&:hover': {
                                                                                    textDecoration: 'underline'
                                                                                }
                                                                            }}
                                                                        >
                                                                            {course.kurskode}
                                                                        </Link>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {course.kursnavn?.replace('No', '')}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                {col.id === 'col-semester' && (
                                                                    <Typography variant="body2">
                                                                        {course.semester || 'N/A'}
                                                                    </Typography>
                                                                )}
                                                                {col.id === 'col-språk' && (
                                                                    <Typography variant="body2">
                                                                        {course.språk || 'N/A'}
                                                                    </Typography>
                                                                )}
                                                                {col.id === 'col-credits' && (
                                                                    <Typography variant="body2">
                                                                        {formatCredits(course.credits) || 'N/A'}
                                                                    </Typography>
                                                                )}
                                                                {col.id === 'col-level' && (
                                                                    <Typography variant="body2">
                                                                        {course.level_of_study?.replace('No', '') || 'N/A'}
                                                                    </Typography>
                                                                )}
                                                                {col.id === 'col-portfolio' && course.portfolio}
                                                                {col.id === 'col-academic-coordinator' && course.academic_coordinator}
                                                                {col.id === 'col-institutt' && course.ansvarlig_institutt}
                                                                {col.id === 'col-område' && course.ansvarlig_område}
                                                                {col.id === 'col-pensum' && course.pensum}
                                                                {col.id === 'col-similarity' && (
                                                                    <SimilarityBadge similarity={course.similarity}>
                                                                        {course.similarity}%
                                                                    </SimilarityBadge>
                                                                )}
                                                                {col.id === 'col-ai' && (
                                                                    <Button
                                                                        size="small"
                                                                        onClick={() => toggleExplanation(course)}
                                                                        disabled={loadingExplanations[course.kurskode]}
                                                                        variant="contained"
                                                                    >
                                                                        {loadingExplanations[course.kurskode] ? (
                                                                            <CircularProgress size={20} />
                                                                        ) : (
                                                                            course.explanation ?
                                                                                (expandedExplanations[course.kurskode] ? 'Skjul' : 'Vis')
                                                                                : 'Analyser'
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </StyledTableCell>
                                                        ))}
                                                </StyledTableRow>
                                                {course.explanation && expandedExplanations[course.kurskode] && (
                                                    <TableRow>
                                                        <TableCell colSpan={availableColumns.length} sx={{ p: 0 }}>
                                                            <RowExplanation
                                                                className={`row-explanation ${expandedExplanations[course.kurskode] ? 'visible' : ''}`}
                                                            >
                                                                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, p: 2 }}>
                                                                    Course Overlap Analysis
                                                                </Typography>
                                                                <Box sx={{ px: 2, pb: 2 }}>
                                                                    {typeof course.explanation === 'string' ?
                                                                        course.explanation.split('\n').map((line, index) => {
                                                                            if (line.startsWith('###')) {
                                                                                return (
                                                                                    <Typography
                                                                                        key={index}
                                                                                        variant="subtitle2"
                                                                                        sx={{
                                                                                            mt: 2,
                                                                                            mb: 1,
                                                                                            color: 'primary.main',
                                                                                            fontWeight: 600
                                                                                        }}
                                                                                    >
                                                                                        {line.replace('###', '').trim()}
                                                                                    </Typography>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <Typography
                                                                                    key={index}
                                                                                    variant="body2"
                                                                                    sx={{
                                                                                        mb: 1,
                                                                                        pl: line.startsWith('▸') || line.startsWith('•') ? 2 : line.startsWith('-') ? 4 : 0
                                                                                    }}
                                                                                >
                                                                                    {line}
                                                                                </Typography>
                                                                            );
                                                                        })
                                                                        : (
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                No explanation available
                                                                            </Typography>
                                                                        )}
                                                                </Box>
                                                            </RowExplanation>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <TablePagination
                            component="div"
                            count={getFilteredResults().length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25]}
                        />
                    </Box>
                </StyledCard>
            )}

            {/* Dialog for kolonnetilpasning */}
            <Dialog
                open={showColumnDialog}
                onClose={() => setShowColumnDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Tilpass kolonner
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Bruk pilene for å endre rekkefølgen. Velg hvilke kolonner som skal vises.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {availableColumns.map((column, index) => (
                            <ColumnListItem key={column.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                    <Switch
                                        checked={column.enabled}
                                        onChange={() => {
                                            if (!column.required) {
                                                const newColumns = availableColumns.map(col =>
                                                    col.id === column.id
                                                        ? { ...col, enabled: !col.enabled }
                                                        : col
                                                );
                                                updateSearchState({ availableColumns: newColumns });
                                            }
                                        }}
                                        disabled={column.required}
                                        inputProps={{
                                            'aria-label': `Toggle ${column.label}`
                                        }}
                                    />
                                    <Typography flex={1}>
                                        {column.label}
                                        {column.required && (
                                            <Typography
                                                component="span"
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ ml: 1 }}
                                            >
                                                (Påkrevd)
                                            </Typography>
                                        )}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => moveColumn(index, 'up')}
                                            disabled={index === 0}
                                        >
                                            <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => moveColumn(index, 'down')}
                                            disabled={index === availableColumns.length - 1}
                                        >
                                            <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </ColumnListItem>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={resetColumnSettings}
                        color="secondary"
                    >
                        Tilbakestill
                    </Button>
                    <Button onClick={() => setShowColumnDialog(false)}>
                        Lukk
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default CourseComparison; 