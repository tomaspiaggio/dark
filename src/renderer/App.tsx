import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import FindInPage from "./components/find-in-page/find-in-page";
import { TabsSidebar } from "./components/sidebar/tabs-sidebar";
import Switcher from "./components/switcher/switcher";
import UrlSpotlight from "./components/url-spotlight/url-spotlight";
import { openTab, openTabAi, openTabSearch, setTab } from "./controller/tabs";
import { toggleTabsSpotlight } from "./controller/url-spotlight";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/change-tab" element={<UrlSpotlight 
          onClose={toggleTabsSpotlight} 
          onSubmitUrl={openTab} 
          onSubmitSearch={(query) => openTabSearch(query, true)} 
          onSubmitAi={(query) => openTabAi(query, true)} />} 
        />
        <Route path="/set-tab" element={<UrlSpotlight 
          onClose={toggleTabsSpotlight} 
          onSubmitUrl={setTab} 
          onSubmitSearch={(query) => openTabSearch(query, false)} 
          onSubmitAi={(query) => openTabAi(query, false)} />} 
        />
        <Route path="/switcher" element={<Switcher />} />
        <Route path="/find-in-page" element={<FindInPage />} />
        <Route path="/" element={<TabsSidebar />} />
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}
