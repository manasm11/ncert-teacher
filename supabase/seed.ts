/**
 * Database seed script for NCERT Teacher (Gyanu AI)
 *
 * Seeds subjects, chapters, chapter content, embeddings, and badges.
 * Designed to be idempotent - can be run multiple times without duplicates.
 *
 * Usage:
 *   npx tsx supabase/seed.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (for admin operations)
 */

import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env'
import { generateEmbedding } from '@/lib/agent/embeddings'

// Chapter content markdown - Class 6 Science
const COMPONENTS_OF_FOOD_MD = `# Chapter 2: Components of Food

## Do You Know?

All living organisms need food. Food gives us energy to perform various activities. It also helps in proper growth and maintenance of our body. The process of obtaining food and utilizing it for growth, repair, and maintenance of the body is called nutrition.

## What Do Different Food Items Contain?

Different food items contain different components. These components are called **nutrients**. The main nutrients are:

1. **Carbohydrates** - Main source of energy
2. **Proteins** - For growth and repair
3. **Fats** - Energy storage and insulation
4. **Vitamins** - For proper body functioning
5. **Minerals** - For healthy bones and teeth
6. **Water** - For various body processes
7. **Dietary Fibres** - For digestion

## Types of Nutrients

### Macronutrients
These are needed in large amounts:
- Carbohydrates
- Proteins
- Fats
- Water

### Micronutrients
These are needed in small amounts:
- Vitamins
- Minerals

## Balanced Diet

A diet that contains all the necessary nutrients in the right amount is called a **balanced diet**. A balanced diet provides:
- Proper growth and development
- Energy for daily activities
- Protection against diseases

## Nutrient Sources

| Nutrient | Source |
|----------|--------|
| Carbohydrates | Rice, wheat, potatoes, sugar |
| Proteins | Lentils, beans, eggs, milk, fish |
| Fats | Ghee, butter, oils, nuts |
| Vitamins | Fruits, vegetables, milk |
| Minerals | Milk, salt, green leafy vegetables |

## Deficiency Diseases

| Nutrient Deficiency | Disease |
|---------------------|---------|
| Carbohydrates | Fatigue, weakness |
| Proteins | Kwashiorkor, marasmus |
| Vitamins | Scurvy, rickets, night blindness |
| Minerals | Anaemia, goitre |

## Activity

Make a list of food items you eat in a day and classify them into:
- Carbohydrate-rich foods
- Protein-rich foods
- Fat-rich foods
- Vitamin and mineral-rich foods

## Points to Ponder

1. Why should we avoid eating only one type of food?
2. How does cooking affect the nutrients in food?
3. What is the role of water in our body?

---

**Remember:** A balanced diet is the key to good health!
`

// Chapter content markdown - Class 6 Math
const KNOWING_OUR_NUMBERS_MD = `# Chapter 1: Knowing Our Numbers

## Comparing Numbers

We use numbers every day. Let us revise how we compare numbers.

### Making Numbers from Digits

To make the smallest number, write the digits in ascending order.
To make the largest number, write the digits in descending order.

**Example:** Using digits 3, 7, 1, 5:
- Smallest number: 1357
- Largest number: 7531

### Ascending and Descending Order

- **Ascending order:** Arranging numbers from smallest to largest
- **Descending order:** Arranging numbers from largest to smallest

**Example:** 4532, 2345, 6789, 1234
- Ascending: 1234, 2345, 4532, 6789
- Descending: 6789, 4532, 2345, 1234

## Large Numbers

We know:
- 1 digit: units
- 2 digits: tens
- 3 digits: hundreds
- 4 digits: thousands
- 5 digits: ten thousands
- 6 digits: lakhs
- 7 digits: ten lakhs
- 8 digits: crores
- 9 digits: ten crores

### Indian System of Numeration

| Period | Places |
|--------|--------|
| Crores | Ten Crores, Crores |
| Lakhs | Ten Lakhs, Lakhs |
| Thousands | Ten Thousands, Thousands |
| Ones | Hundreds, Tens, Ones |

**Example:** 7,45,28,913
- Read as: Seven crore forty-five lakh twenty-eight thousand nine hundred thirteen

### International System of Numeration

| Period | Places |
|--------|--------|
| Billions | Hundreds, Tens, Ones |
| Millions | Hundreds, Tens, Ones |
| Thousands | Hundreds, Tens, Ones |
| Ones | Hundreds, Tens, Ones |

**Example:** 745,289,130
- Read as: Seven hundred forty-five million two hundred eighty-nine thousand one hundred thirty

## Estimation

### Rounding Off

To round off to the nearest ten:
- If the ones digit is 1, 2, 3, or 4, round down
- If the ones digit is 5, 6, 7, 8, or 9, round up

**Example:** 47 rounded to nearest ten = 50

To round off to the nearest hundred:
- Look at the tens digit
- 0-4: round down, 5-9: round up

**Example:** 367 rounded to nearest hundred = 400

### Estimating Sum or Difference

Round off each number to the nearest ten, hundred, or thousand, then add or subtract.

**Example:** 475 + 234
- Round to nearest hundred: 500 + 200 = 700

### Estimating Product

Round off each number to its greatest place, then multiply.

**Example:** 48 × 52 ≈ 50 × 50 = 2500

## Using Brackets

**Example:** 7 × 102 = 7 × (100 + 2) = 7 × 100 + 7 × 2 = 700 + 14 = 714

## Roman Numerals

| Hindu-Arabic | Roman |
|--------------|-------|
| 1 | I |
| 5 | V |
| 10 | X |
| 50 | L |
| 100 | C |
| 500 | D |
| 1000 | M |

**Rules:**
1. Repeat symbols to add (I, II, III, X, XX, XXX)
2. Write smaller symbol after larger to add (VI = 6, LX = 60)
3. Write smaller symbol before larger to subtract (IV = 4, IX = 9)
4. Do not repeat V, L, D

## Large Numbers in Practice

### Conversion

10 millimetres = 1 centimetre
100 centimetres = 1 metre
1000 metres = 1 kilometre
1000 milligrams = 1 gram
1000 grams = 1 kilogram
1000 kilolitres = 1 megilitre

## Activity

1. Measure the length of your classroom in metres and centimetres.
2. Weigh different objects and record their weights in grams and kilograms.
3. Make a list of large numbers you see in newspapers or magazines.

---

**Remember:** Numbers help us understand and describe the world around us!
`

// Chapter content markdown - Class 6 Social Science
const GEOGRAPHY_INTRO_MD = `# Chapter 1: The Earth in the Solar System

## The Solar System

The solar system consists of the Sun and the celestial objects bound to it by gravity.

### The Sun

The Sun is the center of our solar system. It is a huge ball of hot gases that gives us light and heat.

**Key facts about the Sun:**
- Temperature: About 6000°C on surface
- Distance from Earth: About 150 million kilometres
- It is a star
- It provides energy for life on Earth

### Planets

Planets are celestial bodies that orbit the Sun. They do not have their own light.

#### Inner Planets (Terrestrial)

| Planet | Distance from Sun | Unique Feature |
|--------|-------------------|----------------|
| Mercury | Closest | Smallest planet, no atmosphere |
| Venus | Second | Hottest planet, rotates backwards |
| Earth | Third | Only planet with life |
| Mars | Fourth | Red planet, has moons |

#### Outer Planets (Jovian)

| Planet | Distance from Sun | Unique Feature |
|--------|-------------------|----------------|
| Jupiter | Fifth | Largest planet, Great Red Spot |
| Saturn | Sixth | Has beautiful rings |
| Uranus | Seventh | Rotates on its side |
| Neptune | Eighth | Coldest planet |

### Earth - Our Home

Earth is unique because:
1. It is at the right distance from the Sun
2. It has suitable temperature
3. It has water
4. It has atmosphere with oxygen

#### Rotation and Revolution

- **Rotation:** Earth spins on its axis (24 hours = 1 day)
- **Revolution:** Earth moves around the Sun (365 days = 1 year)

#### Seasons

The tilt of Earth's axis causes seasons:
- When Northern Hemisphere tilts toward Sun: Summer in North, Winter in South
- When Southern Hemisphere tilts toward Sun: Summer in South, Winter in North

### The Moon

The Moon is Earth's only natural satellite.

**Key facts:**
- Does not have light of its own
- Reflects sunlight
- Completes one orbit in 27 days
- Has no atmosphere or water

#### Phases of the Moon

The changing appearance of the Moon is called its phases:
1. New Moon
2. Waxing Crescent
3. First Quarter
4. Waxing Gibbous
5. Full Moon
6. Waning Gibbous
7. Last Quarter
8. Waning Crescent

### Asteroids, Comets, and Meteoroids

- **Asteroids:** Small rocky bodies between Mars and Jupiter
- **Comets:** Icy bodies that develop tails near the Sun
- **Meteoroids:** Small particles from space

## Activity

1. Make a model of the solar system using balls of different sizes.
2. Observe the Moon for 15 days and draw its phases.
3. Find out how many hours of daylight you have in a day.

---

**Remember:** Earth is our precious home in the vast universe!
`

// Badge definitions
interface BadgeDefinition {
  name: string
  description: string
  icon: string
  criteria: Record<string, unknown>
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    name: 'First Steps',
    description: 'Complete your first chapter.',
    icon: '🌱',
    criteria: { chapters_completed: 1 }
  },
  {
    name: 'Curious Mind',
    description: 'Ask 50 questions to Gyanu.',
    icon: '🧠',
    criteria: { questions_asked: 50 }
  },
  {
    name: 'Quiz Whiz',
    description: 'Score 100% on any quiz.',
    icon: '🏆',
    criteria: { perfect_quiz: true }
  },
  {
    name: 'Streak Starter',
    description: 'Maintain a 7-day learning streak.',
    icon: '🔥',
    criteria: { streak_days: 7 }
  },
  {
    name: 'Knowledge Seeker',
    description: 'Complete 10 chapters.',
    icon: '📚',
    criteria: { chapters_completed: 10 }
  },
  {
    name: 'Math Master',
    description: 'Complete all Class 10 Math chapters.',
    icon: '🎓',
    criteria: { subject: 'mathematics', grade: 10, all_completed: true }
  },
  {
    name: 'Science Scholar',
    description: 'Complete all Class 10 Science chapters.',
    icon: '🔬',
    criteria: { subject: 'science', grade: 10, all_completed: true }
  },
  {
    name: 'Social Student',
    description: 'Complete all Class 10 Social Science chapters.',
    icon: '🌍',
    criteria: { subject: 'social-science', grade: 10, all_completed: true }
  },
  {
    name: 'English Explorer',
    description: 'Complete all Class 10 English chapters.',
    icon: '📖',
    criteria: { subject: 'english', grade: 10, all_completed: true }
  },
  {
    name: 'Hindi Hobbyist',
    description: 'Complete all Class 10 Hindi chapters.',
    icon: '📝',
    criteria: { subject: 'hindi', grade: 10, all_completed: true }
  },
  {
    name: 'Bookworm',
    description: 'Complete 25 chapters.',
    icon: '📕',
    criteria: { chapters_completed: 25 }
  },
  {
    name: 'Master Learner',
    description: 'Complete 50 chapters.',
    icon: '📜',
    criteria: { chapters_completed: 50 }
  },
  {
    name: 'Perfect Score',
    description: 'Achieve 10 perfect quiz scores.',
    icon: '⭐',
    criteria: { perfect_scores: 10 }
  },
  {
    name: 'Question Master',
    description: 'Ask 200 questions to Gyanu.',
    icon: '❓',
    criteria: { questions_asked: 200 }
  },
  {
    name: 'Learning Legend',
    description: 'Earn 10000 XP.',
    icon: '👑',
    criteria: { total_xp: 10000 }
  }
]

// Subject definitions
interface SubjectDefinition {
  name: string
  slug: string
  icon: string
  description: string
  grade_range_start: number
  grade_range_end: number
}

const SUBJECT_DEFINITIONS: SubjectDefinition[] = [
  {
    name: 'Science',
    slug: 'science',
    icon: '🔬',
    description: 'NCERT Science curriculum covering physics, chemistry, and biology.',
    grade_range_start: 1,
    grade_range_end: 10
  },
  {
    name: 'Mathematics',
    slug: 'mathematics',
    icon: '📐',
    description: 'NCERT Mathematics curriculum covering arithmetic, algebra, geometry, and more.',
    grade_range_start: 1,
    grade_range_end: 12
  },
  {
    name: 'Social Science',
    slug: 'social-science',
    icon: '🌍',
    description: 'History, Geography, Civics, and Economics.',
    grade_range_start: 6,
    grade_range_end: 10
  },
  {
    name: 'English',
    slug: 'english',
    icon: '📖',
    description: 'NCERT English language and literature.',
    grade_range_start: 1,
    grade_range_end: 12
  },
  {
    name: 'Hindi',
    slug: 'hindi',
    icon: '📝',
    description: 'NCERT Hindi language and literature.',
    grade_range_start: 1,
    grade_range_end: 12
  }
]

// Chapter definitions
interface ChapterDefinition {
  subjectSlug: string
  grade: number
  chapterNumber: number
  title: string
  slug: string
  description: string
  content: string
}

const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  {
    subjectSlug: 'science',
    grade: 6,
    chapterNumber: 2,
    title: 'Components of Food',
    slug: 'components-of-food',
    description: 'Nutrients, balanced diet, deficiency diseases, and food sources.',
    content: COMPONENTS_OF_FOOD_MD
  },
  {
    subjectSlug: 'mathematics',
    grade: 6,
    chapterNumber: 1,
    title: 'Knowing Our Numbers',
    slug: 'knowing-our-numbers',
    description: 'Comparing numbers, large numbers, estimation, and Roman numerals.',
    content: KNOWING_OUR_NUMBERS_MD
  },
  {
    subjectSlug: 'social-science',
    grade: 6,
    chapterNumber: 1,
    title: 'The Earth in the Solar System',
    slug: 'earth-in-solar-system',
    description: 'The solar system, planets, Earth, rotation, revolution, and seasons.',
    content: GEOGRAPHY_INTRO_MD
  }
]

/**
 * Get existing subject by slug, or create if not exists
 */
async function getOrCreateSubject(
  supabase: any,
  subject: SubjectDefinition
): Promise<{ id: string; created: boolean }> {
  // Check if subject exists
  const { data: existing, error: fetchError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', subject.slug)
    .single()

  if (existing) {
    console.log(`  ✓ Subject "${subject.name}" already exists (ID: ${existing.id})`)
    return { id: existing.id, created: false }
  }

  // Insert new subject
  const { data: newSubject, error: insertError } = await supabase
    .from('subjects')
    .insert({
      name: subject.name,
      slug: subject.slug,
      icon: subject.icon,
      description: subject.description,
      grade_range_start: subject.grade_range_start,
      grade_range_end: subject.grade_range_end
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create subject "${subject.name}": ${insertError.message}`)
  }

  console.log(`  ✓ Created subject "${subject.name}" (ID: ${newSubject.id})`)
  return { id: newSubject.id, created: true }
}

/**
 * Get existing chapter by subject, grade, and chapter number, or create if not exists
 */
async function getOrCreateChapter(
  supabase: any,
  subjectId: string,
  chapter: ChapterDefinition
): Promise<{ id: string; created: boolean }> {
  // Check if chapter exists
  const { data: existing, error: fetchError } = await supabase
    .from('chapters')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('grade', chapter.grade)
    .eq('chapter_number', chapter.chapterNumber)
    .single()

  if (existing) {
    console.log(`  ✓ Chapter "${chapter.title}" already exists (ID: ${existing.id})`)
    return { id: existing.id, created: false }
  }

  // Insert new chapter
  const { data: newChapter, error: insertError } = await supabase
    .from('chapters')
    .insert({
      subject_id: subjectId,
      grade: chapter.grade,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      slug: chapter.slug,
      description: chapter.description,
      content_markdown: chapter.content,
      status: 'published'
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create chapter "${chapter.title}": ${insertError.message}`)
  }

  console.log(`  ✓ Created chapter "${chapter.title}" (ID: ${newChapter.id})`)
  return { id: newChapter.id, created: true }
}

/**
 * Generate and store embeddings for a chapter
 */
async function generateAndStoreEmbeddings(
  supabase: any,
  chapterId: string,
  chapter: ChapterDefinition,
  subjectName: string
): Promise<void> {
  // Check if embeddings already exist for this chapter
  const { data: existing, error: checkError } = await supabase
    .from('chapter_chunks')
    .select('id')
    .eq('chapter', chapter.slug)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`  ✓ Embeddings for "${chapter.title}" already exist`)
    return
  }

  console.log(`  🌱 Generating embeddings for "${chapter.title}"...`)

  try {
    // Split chapter content into chunks (by headings for better semantic meaning)
    const chunks = splitChapterIntoChunks(chapter.content)

    for (const chunk of chunks) {
      // Generate embedding for this chunk
      const embedding = await generateEmbedding(chunk.content)

      // Store the chunk with embedding
      const { error: insertError } = await supabase
        .from('chapter_chunks')
        .insert({
          content: chunk.content,
          subject: subjectName,
          grade: String(chapter.grade),
          chapter: chapter.slug,
          heading_hierarchy: chunk.headings,
          embedding: embedding
        })

      if (insertError) {
        console.warn(`    ⚠️  Failed to insert chunk: ${insertError.message}`)
        continue
      }
    }

    console.log(`  ✓ Generated ${chunks.length} embeddings for "${chapter.title}"`)
  } catch (error) {
    console.warn(`    ⚠️  Error generating embeddings for "${chapter.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Split chapter content into semantically meaningful chunks
 */
function splitChapterIntoChunks(content: string): { content: string; headings: string[] }[] {
  const chunks: { content: string; headings: string[] }[] = []
  const lines = content.split('\n')
  let currentChunk = ''
  let currentHeadings: string[] = []
  let headingLevel = 0

  for (const line of lines) {
    // Check if this is a heading
    const headingMatch = line.match(/^(#+)\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading = headingMatch[2]

      // If we have accumulated content, save it
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          headings: [...currentHeadings]
        })
        currentChunk = ''
      }

      // Update heading hierarchy
      currentHeadings = currentHeadings.slice(0, level - 1)
      currentHeadings.push(heading)

      // Start new chunk with this heading
      currentChunk = line + '\n'
      headingLevel = level
    } else {
      currentChunk += line + '\n'
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      headings: [...currentHeadings]
    })
  }

  return chunks
}

/**
 * Get existing badge by name, or create if not exists
 */
async function getOrCreateBadge(
  supabase: any,
  badge: BadgeDefinition
): Promise<{ id: string; created: boolean }> {
  // Check if badge exists
  const { data: existing, error: fetchError } = await supabase
    .from('badges')
    .select('id')
    .eq('name', badge.name)
    .single()

  if (existing) {
    console.log(`  ✓ Badge "${badge.name}" already exists (ID: ${existing.id})`)
    return { id: existing.id, created: false }
  }

  // Insert new badge
  const { data: newBadge, error: insertError } = await supabase
    .from('badges')
    .insert({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      criteria: badge.criteria
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create badge "${badge.name}": ${insertError.message}`)
  }

  console.log(`  ✓ Created badge "${badge.name}" (ID: ${newBadge.id})`)
  return { id: newBadge.id, created: true }
}

/**
 * Main seed function
 */
async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seed for Gyanu AI...')
  console.log()

  // Create Supabase client with service role key for admin operations
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    console.error('   This is needed for admin operations like inserting badges.')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable is required')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('📦 Seeding subjects...')
  const subjectIds = new Map<string, string>()
  for (const subject of SUBJECT_DEFINITIONS) {
    const { id } = await getOrCreateSubject(supabase, subject)
    subjectIds.set(subject.slug, id)
  }
  console.log()

  console.log('📚 Seeding chapters...')
  for (const chapter of CHAPTER_DEFINITIONS) {
    const subjectId = subjectIds.get(chapter.subjectSlug)
    if (!subjectId) {
      console.error(`❌ Subject "${chapter.subjectSlug}" not found`)
      process.exit(1)
    }

    const { id: chapterId } = await getOrCreateChapter(supabase, subjectId, chapter)

    // Generate embeddings for the chapter
    await generateAndStoreEmbeddings(supabase, chapterId, chapter, chapter.subjectSlug)
  }
  console.log()

  console.log('🏆 Seeding badges...')
  for (const badge of BADGE_DEFINITIONS) {
    await getOrCreateBadge(supabase, badge)
  }
  console.log()

  console.log('✅ Database seeding completed successfully!')
  console.log()
  console.log('Summary:')
  console.log(`  - ${SUBJECT_DEFINITIONS.length} subjects seeded`)
  console.log(`  - ${CHAPTER_DEFINITIONS.length} chapters seeded`)
  console.log(`  - ${BADGE_DEFINITIONS.length} badges seeded`)
  console.log()
  console.log('Forest grows 🌲🌳🌿')
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error('❌ Error seeding database:', error)
  process.exit(1)
})
