<script>
    import { SvelteToast } from '@zerodevx/svelte-toast'
  import Button from "../components/button.svelte";
</script>
<main>
    <header>
        <div class="logo" />
        <div class="name">
            <a class="main" href="/">STEAMSHARE</a>
            <small style="font-size: .8rem;">by <a href="https://overiit.com" target="_blank">OVERIIT</a></small>
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
            <Button grey>HIRE ME</Button>
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
                small {
                    a { 
                        border-bottom: 1px dotted rgba(255, 255, 255, .5);
                        &:hover {
                            border-bottom-style: solid;
                            border-bottom-color: white;
                        }
                    }
                }
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

    @media only screen and (max-width: 500px) {
        main {
            header {
                .name {
                    display: flex;
                    flex-flow: column;
                    text-align: center;
                    .main {
                        font-size: 1.5rem;
                    }
                    small {
                        font-size: .75rem;
                    }
                }
            }
            footer {
                
                flex-flow: column-reverse;
                align-items: center;
                p {
                    text-align: center;
                    font-size: .5rem;
                }
            }
        }
    }
</style>
