import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getUsers, createUser, updateUser } from '../controllers/user.controller'

const router = Router()

router.use(authenticate)
router.use(authorize('ADMIN'))  // every admin route is ADMIN-only

router.get('/users', getUsers)
router.post('/users', createUser)
router.patch('/users/:id', updateUser)

export default router
