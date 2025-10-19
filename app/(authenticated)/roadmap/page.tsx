import { currentUser, currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { feedback } from '@/schema';
import { desc } from 'drizzle-orm';
import { RoadmapBoard } from '@/components/roadmap-board';
import SubmitModal from './ui/submit-modal';
import { AppTopBar } from '@/components/app-top-bar';
import { PageHeader } from '@/components/page-header';
import AdminToggle from './ui/admin-toggle';
import ImageModal from './ui/image-modal';

export default async function RoadmapPage({ searchParams }: { searchParams?: Promise<{ admin?: string }> }) {
  const user = await currentUser();
  if (!user) return null;
  const profile = await currentUserProfile();

  const items = await database.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(300);
  const isAdmin = profile.role === 'superadmin';
  const sp = (await (searchParams ?? Promise.resolve({}))) as { admin?: string };
  const adminOn = isAdmin && sp.admin === '1';

  return (
    <div>
      <PageHeader
        title="Roadmap"
        description="Track upcoming features and bug fixes."
        rightSlot={isAdmin ? <AdminToggle isOn={adminOn} /> : undefined}
      />
      <div className="container mx-auto px-4">
        <div className="mx-auto">
          <p className="mb-3 text-sm text-muted-foreground">Browse upcoming work. Use the green button below to submit a feature request or bug report; we’ll be notified when you do.</p>
          {adminOn && (
            <p className="mb-4 text-xs text-primary">Admin mode: drag cards between stages or use the menu on each card.</p>
          )}
          <RoadmapBoard items={items as any} editable={adminOn} />
        </div>
        <SubmitModal />
        <ImageModal editable={adminOn} />
      </div>
    </div>
  );
}


