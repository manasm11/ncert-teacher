-- Seed data: sample subjects and chapters for NCERT curriculum

----------------------------------------------------------------------
-- Subjects
----------------------------------------------------------------------
insert into public.subjects (name, slug, icon, description, grade_range_start, grade_range_end) values
  ('Mathematics',     'mathematics',     '📐', 'NCERT Mathematics curriculum covering arithmetic, algebra, geometry, and more.', 1, 12),
  ('Science',         'science',         '🔬', 'NCERT Science curriculum covering physics, chemistry, and biology.',            1, 10),
  ('Physics',         'physics',         '⚛️', 'NCERT Physics for senior secondary students.',                                 11, 12),
  ('Chemistry',       'chemistry',       '🧪', 'NCERT Chemistry for senior secondary students.',                               11, 12),
  ('Biology',         'biology',         '🧬', 'NCERT Biology for senior secondary students.',                                 11, 12),
  ('English',         'english',         '📖', 'NCERT English language and literature.',                                       1, 12),
  ('Hindi',           'hindi',           '📝', 'NCERT Hindi language and literature.',                                         1, 12),
  ('Social Science',  'social-science',  '🌍', 'History, Geography, Civics, and Economics.',                                   6, 10),
  ('Computer Science','computer-science','💻', 'NCERT Computer Science and Informatics Practices.',                            11, 12);

----------------------------------------------------------------------
-- Sample Chapters — Class 10 Mathematics
----------------------------------------------------------------------
insert into public.chapters (subject_id, grade, chapter_number, title, slug, description, status)
select
  s.id,
  10,
  c.chapter_number,
  c.title,
  c.slug,
  c.description,
  'published'
from public.subjects s
cross join (values
  (1,  'Real Numbers',                       'real-numbers',                       'Euclid''s division lemma, Fundamental Theorem of Arithmetic, irrational numbers, decimal expansions.'),
  (2,  'Polynomials',                        'polynomials',                        'Zeros of a polynomial, relationship between zeros and coefficients, division algorithm.'),
  (3,  'Pair of Linear Equations in Two Variables', 'pair-of-linear-equations',    'Graphical and algebraic methods: substitution, elimination, cross-multiplication.'),
  (4,  'Quadratic Equations',                'quadratic-equations',                'Solutions by factorisation, completing the square, quadratic formula, nature of roots.'),
  (5,  'Arithmetic Progressions',            'arithmetic-progressions',            'nth term, sum of first n terms, applications of AP.'),
  (6,  'Triangles',                          'triangles',                          'Similarity of triangles, criteria for similarity, areas, Pythagoras theorem.'),
  (7,  'Coordinate Geometry',                'coordinate-geometry',                'Distance formula, section formula, area of a triangle.'),
  (8,  'Introduction to Trigonometry',       'introduction-to-trigonometry',       'Trigonometric ratios, ratios of complementary angles, trigonometric identities.'),
  (9,  'Some Applications of Trigonometry',  'applications-of-trigonometry',       'Heights and distances problems using trigonometric ratios.'),
  (10, 'Circles',                            'circles',                            'Tangent to a circle, number of tangents from a point.'),
  (11, 'Areas Related to Circles',           'areas-related-to-circles',           'Perimeter and area of a circle, areas of sectors and segments.'),
  (12, 'Surface Areas and Volumes',          'surface-areas-and-volumes',          'Combination of solids, conversion of shapes, frustum of a cone.'),
  (13, 'Statistics',                         'statistics',                         'Mean, median, mode of grouped data, cumulative frequency.'),
  (14, 'Probability',                        'probability',                        'Classical definition, simple problems on single events.')
) as c(chapter_number, title, slug, description)
where s.slug = 'mathematics';

----------------------------------------------------------------------
-- Sample Chapters — Class 10 Science
----------------------------------------------------------------------
insert into public.chapters (subject_id, grade, chapter_number, title, slug, description, status)
select
  s.id,
  10,
  c.chapter_number,
  c.title,
  c.slug,
  c.description,
  'published'
from public.subjects s
cross join (values
  (1,  'Chemical Reactions and Equations',   'chemical-reactions-and-equations',   'Types of chemical reactions: combination, decomposition, displacement, double displacement, oxidation-reduction.'),
  (2,  'Acids, Bases and Salts',             'acids-bases-and-salts',             'Properties, reactions, pH scale, salts and their preparation.'),
  (3,  'Metals and Non-metals',              'metals-and-non-metals',             'Physical and chemical properties, reactivity series, corrosion.'),
  (4,  'Carbon and its Compounds',           'carbon-and-its-compounds',          'Covalent bonding, versatile nature of carbon, nomenclature, chemical properties.'),
  (5,  'Life Processes',                     'life-processes',                    'Nutrition, respiration, transportation, excretion in organisms.'),
  (6,  'Control and Coordination',           'control-and-coordination',          'Nervous system, hormones in animals, phytohormones in plants.'),
  (7,  'How do Organisms Reproduce?',        'how-do-organisms-reproduce',        'Asexual and sexual reproduction, reproductive health.'),
  (8,  'Heredity',                           'heredity',                          'Mendel''s laws, sex determination, evolution.'),
  (9,  'Light – Reflection and Refraction',  'light-reflection-and-refraction',   'Laws of reflection, spherical mirrors, refraction, lenses.'),
  (10, 'The Human Eye and the Colourful World', 'human-eye-colourful-world',      'Defects of vision, refraction through prism, scattering of light.')
) as c(chapter_number, title, slug, description)
where s.slug = 'science';

----------------------------------------------------------------------
-- Sample Badges
----------------------------------------------------------------------
insert into public.badges (name, description, icon, criteria) values
  ('First Steps',       'Complete your first chapter.',          '🌱', '{"chapters_completed": 1}'::jsonb),
  ('Curious Mind',      'Ask 50 questions to Gyanu.',           '🧠', '{"questions_asked": 50}'::jsonb),
  ('Quiz Whiz',         'Score 100% on any quiz.',              '🏆', '{"perfect_quiz": true}'::jsonb),
  ('Streak Starter',    'Maintain a 7-day learning streak.',    '🔥', '{"streak_days": 7}'::jsonb),
  ('Knowledge Seeker',  'Complete 10 chapters.',                '📚', '{"chapters_completed": 10}'::jsonb),
  ('Math Master',       'Complete all Class 10 Math chapters.', '🎓', '{"subject": "mathematics", "grade": 10, "all_completed": true}'::jsonb);
