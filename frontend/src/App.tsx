import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import Collection from "./pages/Collection";
import StartRecipe from "./pages/StartRecipe";
function RecipeRoute() {
  const { name } = useParams();
  return <StartRecipe key={name} />;
}
export default function App() {
  return (
    <BrowserRouter>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Collection />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/start/:name" element={<RecipeRoute />} />
        <Route
          path="*"
          element={
            <main id="main" className="empty-state">
              <h1>This page isn’t in our journal.</h1>
              <Link to="/collection">Back to recipes</Link>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
