const assert = require('chai').assert

describe('Hello World Test', async () => {
  before(async function () {
    const passed = false
    console.log('Before!')
  })
  it('Should print hello world!', async function () {
    try {
      console.log('Hello World!')
      passed = true
    } catch (error) {
      passed = false
      console.log()
    }
    assert(passed, 'Test gave an exception!')
  })
})