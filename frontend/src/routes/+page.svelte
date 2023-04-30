<script>

  import Button from "../components/button.svelte";

</script>
<section>
    <h1>STEAM SHARE</h1>
    <p>Discover the games you share with friends! See which games you and your friends have in common and start playing together today.</p>
    <br />
    <a href="/create">
        <Button primary>GET STARTED</Button>
    </a>
</section>

<style lang="scss">
    section {
        text-align: center;
        width: 700px;
        max-width: calc(100% - 4rem);
        h1 {
            font-size: 3rem;
            line-height: 4rem;
        }
        p {
            font-size: .8rem;
            line-height: .8rem;
        }
    }
</style>