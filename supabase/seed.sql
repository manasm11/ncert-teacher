-- Seed data for NCERT Teacher (Gyanu AI)
-- Idempotent: Can be run multiple times safely
--
-- Usage in psql:
--   psql -d <database> -f supabase/seed.sql
--
-- Or using Supabase SQL Editor:
--   Copy and paste the contents of this file

----------------------------------------------------------------------
-- Subjects (idempotent insert using ON CONFLICT)
----------------------------------------------------------------------

-- First, create a temporary table to hold our seed data
create temp table if not exists _seed_subjects (
    name text,
    slug text,
    icon text,
    description text,
    grade_range_start int,
    grade_range_end int
) on commit drop;

truncate table _seed_subjects;

insert into _seed_subjects (name, slug, icon, description, grade_range_start, grade_range_end) values
  ('Mathematics',     'mathematics',     '📐', 'NCERT Mathematics curriculum covering arithmetic, algebra, geometry, and more.', 1, 12),
  ('Science',         'science',         '🔬', 'NCERT Science curriculum covering physics, chemistry, and biology.',            6, 10),
  ('Social Science',  'social-science',  '🌍', 'History, Geography, Civics, and Economics.',                                   6, 10),
  ('English',         'english',         '📖', 'NCERT English language and literature.',                                       1, 12),
  ('Hindi',           'hindi',           '📝', 'NCERT Hindi language and literature.',                                         1, 12),
  ('Physics',         'physics',         '⚛️', 'NCERT Physics for senior secondary students.',                                 11, 12),
  ('Chemistry',       'chemistry',       '🧪', 'NCERT Chemistry for senior secondary students.',                               11, 12),
  ('Biology',         'biology',         '🧬', 'NCERT Biology for senior secondary students.',                                 11, 12),
  ('Computer Science','computer-science','💻', 'NCERT Computer Science and Informatics Practices.',                            11, 12);

-- Insert or update subjects (idempotent)
insert into public.subjects (name, slug, icon, description, grade_range_start, grade_range_end)
select name, slug, icon, description, grade_range_start, grade_range_end
from _seed_subjects
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  grade_range_start = excluded.grade_range_start,
  grade_range_end = excluded.grade_range_end;

----------------------------------------------------------------------
-- Sample Chapters — Class 6 Science (Chapter 2: Components of Food)
----------------------------------------------------------------------

create temp table _seed_chapters on commit drop as
select
  s.id as subject_id,
  6 as grade,
  c.chapter_number,
  c.title,
  c.slug,
  c.description,
  c.content_markdown,
  'published' as status
from public.subjects s
cross join (values
  (2,
   'Components of Food',
   'components-of-food',
   'Nutrients, balanced diet, deficiency diseases, and food sources.',
   '# Chapter 2: Components of Food

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
  ')
) as c(chapter_number, title, slug, description, content_markdown)
where s.slug = 'science';

-- Insert or update chapters (idempotent)
insert into public.chapters (subject_id, grade, chapter_number, title, slug, description, content_markdown, status)
select subject_id, grade, chapter_number, title, slug, description, content_markdown, status
from _seed_chapters
on conflict (subject_id, grade, chapter_number) do update
set
  title = excluded.title,
  description = excluded.description,
  content_markdown = excluded.content_markdown,
  status = excluded.status;

----------------------------------------------------------------------
-- Sample Chapters — Class 6 Mathematics (Chapter 1: Knowing Our Numbers)
----------------------------------------------------------------------

create temp table _seed_chapters_math on commit drop as
select
  s.id as subject_id,
  6 as grade,
  c.chapter_number,
  c.title,
  c.slug,
  c.description,
  c.content_markdown,
  'published' as status
from public.subjects s
cross join (values
  (1,
   'Knowing Our Numbers',
   'knowing-our-numbers',
   'Comparing numbers, large numbers, estimation, and Roman numerals.',
   '# Chapter 1: Knowing Our Numbers

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
  ')
) as c(chapter_number, title, slug, description, content_markdown)
where s.slug = 'mathematics';

-- Insert or update math chapters (idempotent)
insert into public.chapters (subject_id, grade, chapter_number, title, slug, description, content_markdown, status)
select subject_id, grade, chapter_number, title, slug, description, content_markdown, status
from _seed_chapters_math
on conflict (subject_id, grade, chapter_number) do update
set
  title = excluded.title,
  description = excluded.description,
  content_markdown = excluded.content_markdown,
  status = excluded.status;

----------------------------------------------------------------------
-- Sample Chapters — Class 6 Social Science (Chapter 1: The Earth in the Solar System)
----------------------------------------------------------------------

create temp table _seed_chapters_ss on commit drop as
select
  s.id as subject_id,
  6 as grade,
  c.chapter_number,
  c.title,
  c.slug,
  c.description,
  c.content_markdown,
  'published' as status
from public.subjects s
cross join (values
  (1,
   'The Earth in the Solar System',
   'earth-in-solar-system',
   'The solar system, planets, Earth, rotation, revolution, and seasons.',
   '# Chapter 1: The Earth in the Solar System

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

The tilt of Earth''s axis causes seasons:
- When Northern Hemisphere tilts toward Sun: Summer in North, Winter in South
- When Southern Hemisphere tilts toward Sun: Summer in South, Winter in North

### The Moon

The Moon is Earth''s only natural satellite.

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
  ')
) as c(chapter_number, title, slug, description, content_markdown)
where s.slug = 'social-science';

-- Insert or update social science chapters (idempotent)
insert into public.chapters (subject_id, grade, chapter_number, title, slug, description, content_markdown, status)
select subject_id, grade, chapter_number, title, slug, description, content_markdown, status
from _seed_chapters_ss
on conflict (subject_id, grade, chapter_number) do update
set
  title = excluded.title,
  description = excluded.description,
  content_markdown = excluded.content_markdown,
  status = excluded.status;

----------------------------------------------------------------------
-- Badges
----------------------------------------------------------------------

create temp table _seed_badges on commit drop as
select
  b.name,
  b.description,
  b.icon,
  b.criteria::jsonb as criteria
from (values
  ('First Steps',       'Complete your first chapter.',          '🌱', '{"chapters_completed": 1}'),
  ('Curious Mind',      'Ask 50 questions to Gyanu.',           '🧠', '{"questions_asked": 50}'),
  ('Quiz Whiz',         'Score 100% on any quiz.',              '🏆', '{"perfect_quiz": true}'),
  ('Streak Starter',    'Maintain a 7-day learning streak.',    '🔥', '{"streak_days": 7}'),
  ('Knowledge Seeker',  'Complete 10 chapters.',                '📚', '{"chapters_completed": 10}'),
  ('Math Master',       'Complete all Class 10 Math chapters.', '🎓', '{"subject": "mathematics", "grade": 10, "all_completed": true}'),
  ('Science Scholar',   'Complete all Class 10 Science chapters.', '🔬', '{"subject": "science", "grade": 10, "all_completed": true}'),
  ('Social Student',    'Complete all Class 10 Social Science chapters.', '🌍', '{"subject": "social-science", "grade": 10, "all_completed": true}'),
  ('English Explorer',  'Complete all Class 10 English chapters.', '📖', '{"subject": "english", "grade": 10, "all_completed": true}'),
  ('Hindi Hobbyist',    'Complete all Class 10 Hindi chapters.', '📝', '{"subject": "hindi", "grade": 10, "all_completed": true}'),
  ('Bookworm',          'Complete 25 chapters.',                '📕', '{"chapters_completed": 25}'),
  ('Master Learner',    'Complete 50 chapters.',                '📜', '{"chapters_completed": 50}'),
  ('Perfect Score',     'Achieve 10 perfect quiz scores.',      '⭐', '{"perfect_scores": 10}'),
  ('Question Master',   'Ask 200 questions to Gyanu.',          '❓', '{"questions_asked": 200}'),
  ('Learning Legend',   'Earn 10000 XP.',                       '👑', '{"total_xp": 10000}')
) as b(name, description, icon, criteria);

-- Insert or update badges (idempotent)
insert into public.badges (name, description, icon, criteria)
select name, description, icon, criteria
from _seed_badges
on conflict (name) do update
set
  description = excluded.description,
  icon = excluded.icon,
  criteria = excluded.criteria;

----------------------------------------------------------------------
-- Completion message
----------------------------------------------------------------------

select '✅ Database seeding completed successfully!' as status;
