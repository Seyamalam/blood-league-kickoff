import { describe, expect, it } from 'vitest';
import { createMatchAnnouncementView } from './MatchAnnouncement';

describe('MatchAnnouncement', () => {
  it('provides a distinct Count second-form cinematic identity', () => {
    expect(createMatchAnnouncementView('boss')).toMatchObject({
      title: 'THE COUNT',
      subtitle: 'SECOND FORM · THE NIGHT HAS WINGS',
      color: '#ff315d',
    });
  });
});
