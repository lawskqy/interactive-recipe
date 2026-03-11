import React from 'react'
import {BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Collection from './pages/Collection'
import StartRecipe from './pages/StartRecipe'

function App() {


  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Collection />} />
          <Route path="/collection" element={<Collection/>} />
          <Route path="/start/:name" element={<StartRecipe/>} />
        </Routes>
      </Router>
    </>
  )
}

export default App;  
