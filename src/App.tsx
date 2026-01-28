import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { UploadPage } from './pages/UploadPage';
import { CashEntryPage } from './pages/CashEntryPage';
import { ReviewPage } from './pages/ReviewPage';
import { ExportPage } from './pages/ExportPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<UploadPage />} />
          <Route path="/cash" element={<CashEntryPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
