import { GymBuddyAPIService } from './generated/client';

describe('member generated client', () => {
  it('FS-ADM-09 does not expose staff HTTP operations', () => {
    expect('getAdminUsers' in GymBuddyAPIService.prototype).toBeFalse();
    expect('postAdminFixtures' in GymBuddyAPIService.prototype).toBeFalse();
    expect('postAdminContentTypeIdHide' in GymBuddyAPIService.prototype).toBeFalse();
    expect('getAdminAudit' in GymBuddyAPIService.prototype).toBeFalse();
  });
});
