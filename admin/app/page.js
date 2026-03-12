'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import DocumentList from '@/components/DocumentList';
import SearchTest from '@/components/SearchTest';

export default function Page() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />
      <DocumentList refreshKey={refreshKey} />
      <SearchTest />
    </>
  );
}
