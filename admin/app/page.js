'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import DocumentList from '@/components/DocumentList';
import SearchTest from '@/components/SearchTest';
import AskAI from '@/components/AskAI';

export default function Page() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-10 space-y-14 md:space-y-16">
      <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />
      <DocumentList refreshKey={refreshKey} />
      <AskAI />
      <SearchTest />
    </div>
  );
}
