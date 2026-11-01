"""Show answer is immediate; there is no viewing gate or permission step."""
from playwright.sync_api import expect
def approve_answer(page,trigger='#showAnswer'):
 page.locator(trigger).click()
 expect(page.locator('#answerDialog')).to_be_visible()
