export interface LevelInfo {
  count: number
  level: string
  message: string
  icon: string
}

export function getWriterLevel(count: number): LevelInfo {
  let level = ''
  let message = ''
  let icon = ''

  if (count === 0) {
    level = 'Silent Observer'
    message = 'The journey awaits...'
    icon = 'i-ri-seedling-line'
  }
  else if (count >= 1 && count < 5) {
    level = 'Rookie Writer'
    message = 'Every journey begins with a single step!'
    icon = 'i-ri-quill-pen-line'
  }
  else if (count >= 5 && count < 10) {
    level = 'Apprentice Blogger'
    message = 'You\'re getting the hang of it!'
    icon = 'i-ri-edit-line'
  }
  else if (count >= 10 && count < 25) {
    level = 'Skilled Writer'
    message = 'Knowledge flows through your words!'
    icon = 'i-ri-file-edit-line'
  }
  else if (count >= 25 && count < 50) {
    level = 'Seasoned Author'
    message = 'Your expertise shows in every post!'
    icon = 'i-ri-book-2-line'
  }
  else if (count >= 50 && count < 100) {
    level = 'Master Storyteller'
    message = 'A true wordsmith at work!'
    icon = 'i-ri-book-open-line'
  }
  else if (count >= 100 && count < 200) {
    level = 'Elite Chronicler'
    message = 'Your knowledge archive is impressive!'
    icon = 'i-ri-book-marked-line'
  }
  else {
    level = 'Legendary Sage'
    message = 'An unstoppable force of knowledge!'
    icon = 'i-ri-trophy-line'
  }

  return { count, level, message, icon }
}
