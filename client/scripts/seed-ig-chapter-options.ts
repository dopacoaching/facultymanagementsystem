import { config } from 'dotenv'
// Load .env.local before any other imports so env vars are available
config({ path: '.env.local' })

import mongoose from 'mongoose'

/**
 * Adds the Plus One (+1 / XI) and Plus Two (+2 / XII) chapter lists of the Integrated School
 * subjects English, Hindi, Arabic and Computer Science to the Push Board chapter lists
 * (ChapterOption). Names carry a "+1 · " / "+2 · " prefix because the list is per subject, not
 * per class.
 *
 * Sources: HSSLiVE scheme-of-work PDFs. Hindi and Arabic are the II-Language schemes; the
 * XII Computer Science scheme on file is the 2015-16 one.
 *
 * Idempotent — chapters already on a subject (any casing) are skipped.
 *
 * Run:  npx tsx scripts/seed-ig-chapter-options.ts           (dry run — prints what would be added)
 *       npx tsx scripts/seed-ig-chapter-options.ts --apply   (writes)
 */

const PLUS_ONE: Record<string, string[]> = {
  ENGLISH: [
    'Fufi', 'So Much Happiness (Poem)', 'An Angel in Disguise',
    'A Draught of Kindness', 'Ozymandias (Poem)', 'Classic Cars: Poetry on Wheels', 'A Retrieved Reformation',
    'Women’s World', 'The Window is Blurred', 'What a Wonderful World (Song)',
    'Cat in an Empty Apartment (Poem)', 'Radha, Just Radha', 'Let’s Live with Them',
    'Across the Graveyard of Ships', 'The Trouble with Eggs', 'Designing Dreams',
  ],
  HINDI: [
    'निर्झर', 'जाह्नवी', 'अतिथि कब बतियाओगे', 'बौना संसार', 'लापता लेडीज', 'दोहे',
    'ग़ज़ल', 'जब मुझे नौकरी मिली', 'विटामिन ज़िंदगी', 'प्यासा कुआँ', 'नेलकटर', 'बंजारा मन और बंदिशें',
  ],
  ARABIC: [
    'اللغة هي جواز سفرك', 'الانفتاح على العالم', 'كيرلا - بلاد الشواطئ والغابات', 'عالم بلا قانون',
    'أنت المميز', 'يقظة الروح', 'في سبيل الحرية', 'الوطن كل شيء', 'حقوق المرأة', 'الصداقة حلوة',
    'ظل ظليل', 'بانسة',
  ],
  'COMPUTER SCIENCE': [
    'Introduction to Computing', 'Data Representation and Boolean Algebra', 'Computer System Organisation',
    'Getting Started with Python', 'Python Fundamentals', 'Control Statements', 'Functions', 'Strings',
    'Lists', 'Tuples', 'Dictionary and Set', 'Sorting and Searching', 'Computers and Society',
  ],
}

const PLUS_TWO: Record<string, string[]> = {
  ENGLISH: [
    'The 3Ls of Empowerment (Speech)', 'Any Woman (Poem)', 'Horegallu (Anecdote)', 'Matchbox (Story)',
    'Language elements', 'Mending Wall (Poem)', 'Amigo Brothers (Story)', 'The Hour of Truth (One-act play)',
    'A Three Wheeled Revolution (Interview)', 'Didi (Life writing)', 'Stammer (Poem)',
    'When a Sapling is Planted (Speech)', 'Rice (Poem)', 'Dangers of Drug Abuse (Essay)',
    'Post Early for Christmas (One-act play)', 'This is Going to Hurt Just a Little Bit (Poem)',
    'Crime and Punishment (Story)',
  ],
  HINDI: [
    'मातृभूमि', 'बेटी के नाम पत्र', 'भारतवासियो', 'सूरीनाम में पहला दिन', 'मेरे लाल', 'दोस्ती', 'मंज़िल की ओर',
    'ज़मीन एक स्लेट का नाम है', 'सपने का भी हक नहीं', 'मुरकी उर्फ़ बुलाकी', 'हाइकू',
    'कुमुद फूल बेचनेवाली लड़की', 'वह भटका हुआ पीर', 'आदमी का चेहरा', 'दवा',
  ],
  ARABIC: [
    'خير الله', 'عبقري من أبناء كيرلا', 'كيرلا ... نعم الله', 'ناموا ولا تستيقظوا', 'شرطي المرور', 'كيمياء السعادة',
    'لا تلمني', 'لآلي لغوية', 'هل أنت وحيدة؟', 'لا تقتلوا أنفسكم', 'وصية من الودود', 'أين المفر؟', 'أخبار اليوم',
  ],
  'COMPUTER SCIENCE': [
    'Structures and Pointers', 'Concepts of Object Oriented Programming', 'Data Structures and Operations',
    'Web Technology', 'Web Designing using HTML', 'Client side scripting using JavaScript', 'Web Hosting',
    'Database Management System', 'Structured Query Language', 'Server side Scripting using PHP',
    'Advances in Computing', 'ICT and Society',
  ],
}

async function run() {
  const apply = process.argv.includes('--apply')
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  const col = mongoose.connection.db!.collection('chapteroptions')
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}  (${apply ? 'APPLY' : 'dry run'})`)

  let added = 0, skipped = 0
  for (const subject of Object.keys(PLUS_ONE)) {
    const wanted = [
      ...PLUS_ONE[subject].map((n) => `+1 · ${n}`),
      ...PLUS_TWO[subject].map((n) => `+2 · ${n}`),
    ]
    const existing = new Set((await col.find({ subject }).project({ key: 1 }).toArray()).map((d) => d.key as string))
    const fresh = wanted.filter((n) => !existing.has(n.toLowerCase()))
    skipped += wanted.length - fresh.length
    added += fresh.length
    console.log(`${subject}: ${fresh.length} to add, ${wanted.length - fresh.length} already there`)
    if (apply && fresh.length) {
      const now = new Date()
      // Distinct timestamps keep the +1 → +2 order (the list sorts by createdAt).
      await col.insertMany(fresh.map((name, i) => ({
        subject, name, key: name.toLowerCase(), createdAt: new Date(now.getTime() + i), updatedAt: now,
      })), { ordered: false })
    }
  }
  console.log(`${apply ? 'Added' : 'Would add'} ${added}, skipped ${skipped}.`)
  await mongoose.disconnect()
}

run().catch((e) => { console.error(e); process.exit(1) })
