import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
    });
}

// Export supabase client since it's used in other files
export const supabase = createClient(supabaseUrl, supabaseKey);

// Custom stopwords (hardcoded for browser environment)
const customStopwords = new Set([
    'og', 'i', 'jeg', 'det', 'at', 'en', 'den', 'til', 'er', 'som',
    'på', 'de', 'med', 'han', 'av', 'ikke', 'der', 'så', 'var', 'meg',
    'seg', 'men', 'ett', 'har', 'om', 'vi', 'min', 'mitt', 'ha', 'hadde',
    'hun', 'nå', 'over', 'da', 'ved', 'fra', 'du', 'ut', 'sin', 'dem',
    'oss', 'opp', 'man', 'kan', 'hans', 'hvor', 'eller', 'hva', 'skal', 'selv',
    'sjøl', 'her', 'alle', 'vil', 'bli', 'ble', 'blitt', 'kunne', 'inn', 'når',
    'være', 'kom', 'noen', 'noe', 'ville', 'dere', 'som', 'deres', 'kun', 'ja',
    'etter', 'ned', 'skulle', 'denne', 'for', 'deg', 'si', 'sine', 'sitt', 'mot',
    'å', 'meget', 'hvorfor', 'dette', 'disse', 'uten', 'hvordan', 'ingen', 'din',
    'ditt', 'blir', 'samme', 'hvilken', 'hvilke', 'sånn', 'inni', 'mellom', 'vår',
    'hver', 'hvem', 'vors', 'hvis', 'både', 'bare', 'enn', 'fordi', 'før', 'mange',
    'også', 'slik', 'vært', 'være', 'båe', 'begge', 'siden', 'dykk', 'dykkar', 'dei',
    'deira', 'deires', 'deim', 'di', 'då', 'eg', 'ein', 'eit', 'eitt', 'elles',
    'honom', 'hjå', 'ho', 'hoe', 'henne', 'hennar', 'hennes', 'hoss', 'hossen', 'ikkje',
    'ingi', 'inkje', 'korleis', 'korso', 'kva', 'kvar', 'kvarhelst', 'kven', 'kvi',
    'kvifor', 'me', 'medan', 'mi', 'mine', 'mykje', 'no', 'nokon', 'noka', 'nokor',
    'noko', 'nokre', 'si', 'sia', 'sidan', 'so', 'somt', 'somme', 'um', 'upp', 'vere',
    'vore', 'verte', 'vort', 'varte', 'vart'
]);

// Function to remove stopwords and clean text
function removeStopwords(text) {
    if (!text) return '';

    const normalizedText = text.toLowerCase()
        .normalize('NFKC')
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"');

    const tokens = normalizedText.split(/\s+/);

    return tokens
        .filter(token => !customStopwords.has(token))
        .filter(token => /^[a-zæøåA-ZÆØÅ-]+$/i.test(token))
        .join(' ');
}

// Function to extract keywords using RAKE-like algorithm
function extractKeywords(text) {
    if (!text) return [];

    const cleanText = text.toLowerCase()
        .normalize('NFKC')
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/[^a-zæøåA-ZÆØÅ\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = removeStopwords(cleanText).split(/\s+/);

    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
        if (word.length > 1) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    return Object.entries(wordFreq)
        .filter(([_, freq]) => freq > 1)
        .sort(([_, freqA], [__, freqB]) => freqB - freqA)
        .map(([word]) => word)
        .slice(0, 10);
}

// Function to prepare course text for embedding
export function prepareCourseText(course) {
    const sections = [];

    // Keep course identifiers separate
    if (course.kursnavn) sections.push(`COURSE NAME: ${course.kursnavn}`);
    if (course.kurskode) sections.push(`COURSE CODE: ${course.kurskode}`);

    // Combine all learning outcomes and content
    const combinedText = [
        course.learning_outcome_knowledge,
        course.learning_outcome_skills,
        course.learning_outcome_general_competence,
        course.course_content
    ].filter(Boolean).join(' ');

    // Clean the combined text while preserving Norwegian characters
    const cleanedText = removeStopwords(combinedText);
    if (cleanedText) {
        sections.push('COURSE CONTENT AND LEARNING OUTCOMES:');
        sections.push(cleanedText);
    }

    // Extract keywords from the cleaned combined text
    const keywords = extractKeywords(cleanedText);
    if (keywords.length > 0) {
        sections.push('KEY CONCEPTS:');
        sections.push(keywords.join(' '));
    }

    return sections.join('\n\n');
}

// Generate embedding using HuggingFace API
const API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/distiluse-base-multilingual-cased-v2';

export async function generateHFEmbedding(text) {
    // Handle object input
    let textToProcess = '';
    if (typeof text === 'object') {
        textToProcess = [
            text.name || '',
            text.content || ''
        ].filter(Boolean).join('\n\n');
    } else {
        textToProcess = text;
    }

    console.log('Generating embedding for cleaned text:', textToProcess.slice(0, 100) + '...');
    console.log('Cleaned text length:', textToProcess.length);
    console.log('Using API URL:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.REACT_APP_HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: [textToProcess],
                options: {
                    wait_for_model: true,
                }
            })
        });

        console.log('API Response status:', response.status);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API request failed: ${JSON.stringify(error)}`);
        }

        const result = await response.json();
        console.log('Received embedding dimensions:', result[0].length);

        if (!result || !Array.isArray(result) || result.length === 0 || !Array.isArray(result[0])) {
            throw new Error(`Invalid response format: ${JSON.stringify(result)}`);
        }

        if (result[0].length !== 512) {
            throw new Error(`Expected 512 dimensions but got ${result[0].length}`);
        }

        return result[0];
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

// Calculate cosine similarity between two vectors
export function calculateCosineSimilarity(vecA, vecB) {
    console.log('=== Starting similarity calculation ===');
    console.log('Vector dimensions:', { vecALength: vecA?.length, vecBLength: vecB?.length });

    try {
        if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
            console.error('Invalid vectors:', { vecA, vecB });
            throw new Error('Invalid vectors provided');
        }

        if (vecA.length !== vecB.length) {
            console.error('Vector dimension mismatch:', { dimA: vecA.length, dimB: vecB.length });
            throw new Error('Vector dimensions do not match');
        }

        // Check if vectors are identical
        const isIdentical = vecA.every((val, idx) => Math.abs(val - vecB[idx]) < 1e-10);
        if (isIdentical) {
            console.log('Vectors are identical!');
            return 1;
        }

        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

        if (magnitudeA === 0 || magnitudeB === 0) {
            console.error('Zero magnitude vector detected:', { magnitudeA, magnitudeB });
            return 0;
        }

        const similarity = dotProduct / (magnitudeA * magnitudeB);
        console.log('Raw similarity score:', similarity);

        // Only apply non-linear scaling if not an exact match
        const scaledSimilarity = isIdentical ? 1 : Math.pow(similarity, 1.5);
        console.log('Scaled similarity score:', scaledSimilarity);

        return scaledSimilarity;

    } catch (error) {
        console.error('Error in cosineSimilarity calculation:', error);
        return 0;
    }
}

// Calculate course similarity with regional comparisons
export function calculateCourseSimilarity(vecA, vecB) {
    const similarity = calculateCosineSimilarity(vecA, vecB);

    // If it's an exact match from cosine similarity, return 100
    if (similarity === 1) {
        return 100;
    }

    // Apply non-linear scaling to emphasize high similarities
    let score = similarity * 100;

    if (score >= 70) {
        // Boost high similarities
        score = Math.min(99.9, score * 1.2); // Cap at 99.9 to reserve 100 for exact matches
    } else if (score >= 40) {
        // Gentle boost for moderate similarities
        score = score * 1.1;
    } else {
        // Reduce noise from low similarities
        score = score * 0.8;
    }

    return Math.round(score * 10) / 10; // Round to 1 decimal place
}

// Find similar courses from a list
export const findSimilarCourses = async (newCourseData, storedCourses) => {
    try {
        // Legg til logging for å verifisere input
        console.log('New course data received:', {
            name: newCourseData.name,
            pensum: newCourseData.pensum,
            hasEmbedding: !!newCourseData.embedding
        });

        return storedCourses
            .filter(course => course.embedding)
            .map(course => {
                const similarity = calculateCourseSimilarity(
                    newCourseData.embedding,
                    course.embedding
                );

                // Forbedret logging for pensum-sammenligning
                console.log('Course comparison:', {
                    new_course: {
                        name: newCourseData.name,
                        pensum_length: newCourseData.pensum?.length || 0,
                        pensum_sample: newCourseData.pensum?.substring(0, 100)
                    },
                    existing_course: {
                        kurskode: course.kurskode,
                        pensum_length: course.pensum?.length || 0,
                        pensum_sample: course.pensum?.substring(0, 100)
                    }
                });

                return {
                    // Eksisterende felt
                    kurskode: course.kurskode,
                    kursnavn: course.kursnavn,
                    credits: course.credits,
                    level_of_study: course.level_of_study,
                    språk: course.språk,
                    semester: course.semester,
                    portfolio: course.portfolio,
                    ansvarlig_institutt: course.ansvarlig_institutt,
                    ansvarlig_område: course.ansvarlig_område,
                    academic_coordinator: course.academic_coordinator,
                    course_content: course.course_content,
                    learning_outcome_knowledge: course.learning_outcome_knowledge,
                    learning_outcome_skills: course.learning_outcome_skills,
                    learning_outcome_general_competence: course.learning_outcome_general_competence,
                    pensum: course.pensum,
                    link_nb: course.link_nb,
                    link_en: course.link_en,
                    similarity
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
        console.error('Error in findSimilarCourses:', error);
        throw error;
    }
};

export function generateExcelReport(overlappingCourses, additionalInfo) {
    const wb = XLSX.utils.book_new();

    // Sort courses by overlap score
    const sortedCourses = overlappingCourses.sort((a, b) => b['Overlap Score (%)'] - a['Overlap Score (%)']);

    // Prepare data for Excel
    const data = sortedCourses.map(course => {
        const courseCode = course['Existing Course Code'];
        const addInfo = additionalInfo.find(info => info.kurskode === courseCode) || {};

        return {
            'School': addInfo.school || '',
            'Course Code': courseCode,
            'Course Name': course['Existing Course Name'],
            'Credits': addInfo.credits || '',
            'Overlap Score (%)': course['Overlap Score (%)'],
            'Level': addInfo.level_of_study || '',
            'Academic Coordinator': addInfo.academic_coordinator || '',
            'Department': addInfo.ansvarlig_område || '',
            'Language': addInfo.undv_språk || '',
            'Keywords': course.Keywords || '',
            'Explanation': course.Explanation || '',
            'Portfolio': addInfo.portfolio || '',
            'Institute': addInfo.ansvarlig_institutt || '',
            'Link (EN)': addInfo.link_en || '',
            'Link (NO)': addInfo.link_nb || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Overlap Results");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = {};
    data.forEach(row => {
        Object.keys(row).forEach(key => {
            const value = String(row[key]);
            colWidths[key] = Math.min(
                Math.max(colWidths[key] || 0, value.length),
                maxWidth
            );
        });
    });

    ws['!cols'] = Object.values(colWidths).map(width => ({ width }));

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generatePDFReport(overlappingCourses, additionalInfo) {
    const doc = new jsPDF('l', 'pt', 'a4');
    const sortedCourses = overlappingCourses
        .sort((a, b) => b['Overlap Score (%)'] - a['Overlap Score (%)'])
        .slice(0, 15);

    // Add title
    doc.setFontSize(16);
    doc.text('Top 15 Overlapping Courses', 40, 40);

    // Prepare table data
    const tableData = sortedCourses.map(course => {
        const courseCode = course['Existing Course Code'];
        const addInfo = additionalInfo.find(info => info.kurskode === courseCode) || {};

        return [
            addInfo.school || '',
            courseCode,
            course['Existing Course Name'],
            addInfo.credits || '',
            `${course['Overlap Score (%)'].toFixed(2)}%`,
            addInfo.level_of_study || ''
        ];
    });

    // Add main table
    doc.autoTable({
        head: [['School', 'Code', 'Name', 'Credits', 'Overlap %', 'Level']],
        body: tableData,
        startY: 60,
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 70 },
            2: { cellWidth: 200 },
            3: { cellWidth: 50 },
            4: { cellWidth: 60 },
            5: { cellWidth: 70 }
        }
    });

    // Add explanations
    let yPos = doc.lastAutoTable.finalY + 30;
    sortedCourses.forEach(course => {
        if (course.Explanation) {
            if (yPos > 500) {
                doc.addPage();
                yPos = 40;
            }

            doc.setFontSize(10);
            doc.text(`${course['Existing Course Name']} (${course['Existing Course Code']})`, 40, yPos);

            doc.setFontSize(8);
            const splitText = doc.splitTextToSize(course.Explanation, 750);
            doc.text(splitText, 40, yPos + 15);

            yPos += 20 + (splitText.length * 10);
        }
    });

    return doc.output('blob');
}

export async function testHuggingFaceConnection() {
    try {
        const testText = "Dette er en test av HuggingFace API tilkobling.";
        console.log('Starting HuggingFace connection test...');
        console.log('API Key present:', !!process.env.REACT_APP_HUGGINGFACE_API_KEY);
        console.log('Test text:', testText);

        const embedding = await generateHFEmbedding(testText);

        if (!embedding) {
            throw new Error('No embedding returned from API');
        }

        console.log('Connection successful!');
        console.log('Embedding dimensions:', embedding.length);
        console.log('First 5 values:', embedding.slice(0, 5));
        console.log('Full embedding type:', typeof embedding);
        console.log('Is array?', Array.isArray(embedding));

        return {
            success: true,
            dimensions: embedding.length,
            sample: embedding.slice(0, 5)
        };
    } catch (error) {
        console.error('HuggingFace connection test failed:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        return {
            success: false,
            error: error.message
        };
    }
}

export const generateCourseAnalysis = async (newCourse, existingCourse, similarity) => {
    // Mer detaljert logging
    console.log('Raw input data:', {
        newCourse,
        existingCourse,
        similarity
    });

    // Forbedret logging for å verifisere pensum-data
    console.log('Course data received for analysis:', {
        new_course: {
            name: newCourse.name,
            pensum_exists: !!newCourse.pensum,
            pensum_length: newCourse.pensum?.length || 0,
            pensum_content: newCourse.pensum?.substring(0, 100) || 'No content',
            literature_exists: !!newCourse.literature,
            literature_length: newCourse.literature?.length || 0
        },
        existing_course: {
            kurskode: existingCourse.kurskode,
            pensum_exists: !!existingCourse.pensum,
            pensum_length: existingCourse.pensum?.length || 0,
            pensum_content: existingCourse.pensum?.substring(0, 100) || 'No content'
        }
    });

    // Forenklet hjelpefunksjon for å formatere pensum med bedre logging
    const formatPensum = (course) => {
        console.log('Formatting pensum for course:', {
            name: course.name || course.kurskode,
            pensum: !!course.pensum,
            literature: !!course.literature
        });

        const pensumText = course.pensum || course.literature || '';
        if (!pensumText) {
            console.log(`No pensum found for course: ${course.name || course.kurskode}`);
            return 'Ikke spesifisert';
        }
        return pensumText;
    };

    // Hjelpefunksjon for å formatere læringsutbytte
    const formatLearningOutcomes = (course) => {
        return {
            knowledge: course.learning_outcome_knowledge || '',
            skills: course.learning_outcome_skills || '',
            competence: course.learning_outcome_general_competence || ''
        };
    };

    // Hent læringsutbytter
    const newCourseOutcomes = formatLearningOutcomes(newCourse);
    const existingCourseOutcomes = formatLearningOutcomes(existingCourse);

    console.log('Analyzing courses with pensum:', {
        new_course_pensum: formatPensum(newCourse),
        existing_course_pensum: formatPensum(existingCourse)
    });

    const prompt = `Du er en erfaren norsk universitetsrådgiver hos handelshøyskolen BI som skal analysere potensielt overlapp mellom kurs.

KURS SOM SAMMENLIGNES:

NYTT KURS:
Navn: "${newCourse.name}"
Beskrivelse: ${newCourse.content || 'Ikke spesifisert'}
Pensum: ${formatPensum(newCourse)}
Læringsutbytte:
${newCourseOutcomes.knowledge ? `- Kunnskap: ${newCourseOutcomes.knowledge}` : ''}
${newCourseOutcomes.skills ? `- Ferdigheter: ${newCourseOutcomes.skills}` : ''}
${newCourseOutcomes.competence ? `- Generell kompetanse: ${newCourseOutcomes.competence}` : ''}

EKSISTERENDE KURS:
Kode: ${existingCourse.kurskode}
Navn: "${existingCourse.kursnavn}"
Studiepoeng: ${existingCourse.credits || 'Ikke spesifisert'}
Nivå: ${existingCourse.level_of_study || 'Ikke spesifisert'}
Beskrivelse: ${existingCourse.course_content || 'Ikke spesifisert'}
Pensum: ${formatPensum(existingCourse)}
Læringsutbytte:
${existingCourseOutcomes.knowledge ? `- Kunnskap: ${existingCourseOutcomes.knowledge}` : ''}
${existingCourseOutcomes.skills ? `- Ferdigheter: ${existingCourseOutcomes.skills}` : ''}
${existingCourseOutcomes.competence ? `- Generell kompetanse: ${existingCourseOutcomes.competence}` : ''}

Beregnet overlapp: ${similarity}%

Gi en strukturert analyse med følgende punkter:

### 1. OVERLAPPENDE ELEMENTER
- Identifiser hovedtemaer og konsepter som overlapper
- Spesifiser hvilke læringsutbytter som er like
${similarity >= 60 ? '- Påpek særlig kritiske overlapp som bør adresseres' : ''}

### 2. UNIKE ELEMENTER
- Beskriv unike temaer i nytt kurs
- Beskriv unike temaer i eksisterende kurs
- Vurder om forskjellene er vesentlige nok til å rettferdiggjøre separate kurs

### 3. PENSUMVURDERING
- Sammenlign pensum og læremidler
- Identifiser overlappende litteratur
- Vurder om pensumlistene kompletterer hverandre
- Nevn alltid et par referanser

### 4. NIVÅ OG MÅLGRUPPE
- Sammenlign akademisk nivå
- Vurder om kursene retter seg mot samme målgruppe
- Analyser progresjon og forkunnskapskrav

### 5. ANBEFALING
${similarity >= 70
            ? '- Vurder om kursene ser ut til å være såpass overlappene at en student ikke kan ha de stående på samme vitnemål grunnet for høy grad av overlappå\n- Foreslå konkrete tiltak for å redusere overlapp'
            : similarity >= 40
                ? '- Foreslå hvordan kursene kan differensieres tydeligere\n- Identifiser muligheter for komplementær læring'
                : '- Vurder om kursene kan koordineres bedre\n- Foreslå eventuelle justeringer'}

VIKTIG: 
- Vær konkret og spesifikk i analysene
- Støtt vurderingene med eksempler fra kursbeskrivelsene
- Fokuser på faglig relevans og studentenes læring

NB: Dette er en automatisk analyse basert på tilgjengelig informasjon, og bør valideres av fagpersoner. Ved betydelig overlapp (>${similarity}%) bør grundigere faglig vurdering gjennomføres.`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4-turbo-preview",
            temperature: 0.7,
            max_tokens: 2000
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating course analysis:', error);
        throw error;
    }
}; 