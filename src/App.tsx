import { Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireGuest } from './auth/guards'
import { Layout } from './components/Layout'
import { AccountPage } from './pages/AccountPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MatchPage } from './pages/MatchPage'
import { MyOffersPage } from './pages/MyOffersPage'
import { MySessionsPage } from './pages/MySessionsPage'
import { NewOfferPage } from './pages/NewOfferPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OfferPage } from './pages/OfferPage'
import { PeoplePage } from './pages/PeoplePage'
import { RegisterPage } from './pages/RegisterPage'
import { SkillPage } from './pages/SkillPage'
import { SkillsPage } from './pages/SkillsPage'
import { UserPage } from './pages/UserPage'

// Section 7: twelve routes, plus /people for the people recommender.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="register" element={<RequireGuest><RegisterPage /></RequireGuest>} />
        <Route path="login" element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="skills/:id" element={<SkillPage />} />
        <Route path="match/:skillId" element={<RequireAuth><MatchPage /></RequireAuth>} />
        <Route path="offers/new" element={<RequireAuth><NewOfferPage /></RequireAuth>} />
        <Route path="offers/:id" element={<OfferPage />} />
        <Route path="users/:username" element={<UserPage />} />
        <Route path="people" element={<RequireAuth><PeoplePage /></RequireAuth>} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="account/offers" element={<RequireAuth><MyOffersPage /></RequireAuth>} />
        <Route path="account/sessions" element={<RequireAuth><MySessionsPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
