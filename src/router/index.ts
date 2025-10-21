import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '@/views/AuthView.vue'
import { getUser } from '@/services/authToken'
import ProfileView from '@/views/ProfileView.vue'
import FriendsView from '@/views/FriendsView.vue'
import SessionView from '@/views/SessionView.vue'
import PublishView from '@/views/PublishView.vue'
import EditPostView from '@/views/EditPostView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView
    },
    {
      path: '/friends',
      name: 'friends',
      component: FriendsView
    },
    {
      path: '/session',
      name: 'session',
      component: SessionView
    },
    {
      path: '/publish',
      name: 'publish',
      component: PublishView
    },
    {
      path: '/edit-post/:id',
      name: 'edit-post',
      component: EditPostView
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView
    }
  ]
})

router.beforeEach((to) => {
  const user = getUser()
  if (to.path === '/' && !user) {
    return { path: '/auth', query: to.query, hash: to.hash }
  }
  if ((to.path === '/profile' || to.path === '/friends' || to.path === '/session') && !user) {
    return { path: '/auth', query: { redirect: to.fullPath }, hash: to.hash }
  }
  if ((to.path === '/publish' || to.path.startsWith('/edit-post')) && !user) {
    return { path: '/auth', query: { redirect: to.fullPath }, hash: to.hash }
  }
})

export default router
