"""Unrelated interaction tests dismiss the new reward popup as a student would."""
def auto_dismiss_completion(page):
 page.add_locator_handler(page.locator('#completionDialog'),lambda:page.locator('#closeCompletion').click())
