import 'dotenv/config'
import { connectDB } from './config/db'
import app from './app'

const PORT = Number(process.env.PORT ?? 5000)

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('DB connection failed:', err)
    process.exit(1)
  })
