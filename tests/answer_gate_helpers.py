"""Browser-test teacher setup and approval; test PIN is never an application default."""
from playwright.sync_api import expect
TEST_PIN='246810'
def setup_teacher_pin(page):
 if page.evaluate('!!teacherPin()'):return
 visible=page.locator('#teacherPanel').is_visible()
 if not visible:page.locator('#teacher').click()
 page.locator('#teacherPinSetup').click()
 page.locator('#newTeacherPin').fill(TEST_PIN);page.locator('#confirmTeacherPin').fill(TEST_PIN)
 page.locator('#saveTeacherPin').click();expect(page.locator('#teacherPinDialog')).not_to_be_visible()
 if not visible:page.locator('#teacher').click()
def approve_answer(page,trigger='#showAnswer'):
 setup_teacher_pin(page)
 if not getattr(page,'_dance_clock_installed',False):
  page.clock.install();page._dance_clock_installed=True
 page.locator(trigger).click()
 expect(page.locator('#danceDialog')).to_be_visible()
 expect(page.locator('#answerDialog')).not_to_be_visible()
 page.clock.fast_forward(3100)
 page.locator('#approvalPin').fill(TEST_PIN);page.locator('#approveDance').click()
 expect(page.locator('#answerDialog')).to_be_visible()
