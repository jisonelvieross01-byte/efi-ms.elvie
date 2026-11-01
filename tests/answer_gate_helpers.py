"""Test setup for help content checks; real timing is covered by mission_clock_test."""
from playwright.sync_api import expect

def unlock_help(page):
 page.evaluate("""()=>{remaining=30;if(missionPhase==='ready')missionPhase='paused';if(missionPhase==='running')missionDeadline=Date.now()+30000;renderTimer();persist();}""")

def approve_answer(page,trigger='#showAnswer'):
 unlock_help(page)
 page.locator(trigger).click()
 expect(page.locator('#answerDialog')).to_be_visible()
