export interface LevelInfo {
  count: number
  level: string
  message: string
}

export function getWriterLevel(count: number): LevelInfo {
  let level = ''
  let message = ''

  if (count === 0) {
    level = 'Silent Observer'
    message = 'The journey awaits...'
  }
  else if (count >= 1 && count < 5) {
    level = 'Rookie Writer'
    message = 'Every journey begins with a single step!'
  }
  else if (count >= 5 && count < 10) {
    level = 'Apprentice Blogger'
    message = 'You\'re getting the hang of it!'
  }
  else if (count >= 10 && count < 25) {
    level = 'Skilled Writer'
    message = 'Knowledge flows through your words!'
  }
  else if (count >= 25 && count < 50) {
    level = 'Seasoned Author'
    message = 'Your expertise shows in every post!'
  }
  else if (count >= 50 && count < 100) {
    level = 'Master Storyteller'
    message = 'A true wordsmith at work!'
  }
  else if (count >= 100 && count < 200) {
    level = 'Elite Chronicler'
    message = 'Your knowledge archive is impressive!'
  }
  else {
    level = 'Legendary Sage'
    message = 'An unstoppable force of knowledge!'
  }

  return { count, level, message }
}
