import { Redirect } from 'expo-router';

import { appVariant } from '@/lib/variant';

export default function Index() {
  return <Redirect href={appVariant === 'pubs' ? '/pubs' : '/discover'} />;
}
