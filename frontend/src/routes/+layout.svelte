<script>
    import { SvelteToast } from '@zerodevx/svelte-toast'
  import Button from "../components/button.svelte";
</script>
<main>
    <header>
        <div class="logo" />
        <div class="name">
            <a href="/">OVERIIT</a>
        </div>
      </header>
      <SvelteToast />
      
      <slot />
      
      <footer>
        <div class="data">
          <p>
            SteamShare is a hobby project and <b>is not affiliated with </b>
            Valve or Steam. <br />
            Steam and the Steam logo are trademarks of Valve Corporation. All other trademarks
            are property of their respective owners.
          </p>
        </div>
        <a href="https://overiit.com" target="_blank">
            <Button grey>Hire Me!</Button>
        </a>
      </footer>
</main>

<style lang="scss">
    main {
        background: #222429;
        color: white;
        height: 100%;
        width: 100%;
        display: flex;
        flex-flow: column;
        justify-content: space-between;
        align-items: center;
        overflow-y: auto;

        header {
            padding: 1.5rem;
            width: calc(100% - 3rem);
            a {
                color: white;
            }
            .logo {}
            .name {
                font-size: 2rem;
                font-weight: 900;
            }
        }
        footer {
            padding: 1.5rem;
            width: calc(100% - 3rem);
            display: flex;
            justify-content: space-between;
            p {
                font-size: .75rem;
                color: rgba(255, 255, 255, .5);
            }
        }
    }
</style>
