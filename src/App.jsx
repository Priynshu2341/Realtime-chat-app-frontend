import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/authpages/RegisterPage'
import './App.css'
import { Route, Routes } from 'react-router'
import { ChatPage } from './pages/chatpage/ChatPage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} ></Route> 
      <Route path='/register' element={<RegisterPage />} ></Route>
      <Route path="/" element={<ChatPage />} ></Route>
    </Routes>
      
  )
}

export default App
