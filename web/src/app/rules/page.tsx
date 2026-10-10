import { RulesReaderClient } from '@/components/RulesReaderClient';

export const metadata = {
  title: 'Regulasi | Rivals Series Season 1',
  description: 'Dokumen regulasi resmi kompetisi Rivals Series Season 1 BAB I hingga BAB XII.',
};

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  return <RulesReaderClient />;
}
