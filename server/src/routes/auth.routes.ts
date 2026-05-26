import { Router } from 'express'
import { login, logout, refresh, changePassword } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.post('/change-password', authenticate, changePassword)

export default router
