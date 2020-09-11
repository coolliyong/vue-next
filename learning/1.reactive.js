const { ref, reactive, effect, watch } = Vue

const state = reactive({
  list: ['vue', 'vue3'],
  hello: {
    helloa: ''
  }
})

effect(() => {
  console.log('list发生变化', state.hello.helloa)
})

setTimeout(() => {
  console.log('react')
  // push 方法依旧无法被监听到.
  // state.list.push('react');
  state.list = [...state.list, 'react']
  state.hello.helloa = '123'
}, 1000)

console.log(state.hello.helloa);

// const {ref,reactive,effect,watch} = Vue;

// const state = reactive({ count: 0 })
// watch(
//   () => state.count,
//   (count, prevCount) => {
//     console.log(count);
//   }
// )

// setTimeout(() =>{
//   state.count = 5;
//   console.log('123');
// },1000)
