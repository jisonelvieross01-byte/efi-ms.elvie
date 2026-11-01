"""Wait for the actual dance renderer, then advance the five-second viewing gate."""
from playwright.sync_api import expect
def approve_answer(page,trigger='#showAnswer'):
 if not getattr(page,'_dance_clock_installed',False):
  page.clock.install();page._dance_clock_installed=True
 page.locator(trigger).click()
 expect(page.locator('#danceDialog')).to_be_visible()
 expect(page.locator('#answerDialog')).not_to_be_visible()
 page.wait_for_function('danceRequest && danceRequest.started !== null')
 page.clock.fast_forward(5100)
 page.locator('#continueDance').click()
 expect(page.locator('#answerDialog')).to_be_visible()
