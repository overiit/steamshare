<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_BASE_API } from "$env/static/public";
  import Button from "../../components/button.svelte";
  import type { SteamGame, SteamUser } from "../../types";
  import { toast } from "@zerodevx/svelte-toast";

  $: group_id = $page.url.searchParams.get("id");

  $: fetchGroup(group_id);

  let group: {
    members: (SteamUser & { status: "loading" | "loaded" })[];
    games: (SteamGame & { combined_playtime: number })[];
  } = {
    members: [],
    games: [],
  };

  function fetchGroup(group_id: string | null) {
    if (!group_id) {
      group.members = [];
      group.games = [];
    }
    console.log("fetching");
    fetch(`${PUBLIC_BASE_API}/group/view?group_id=${group_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          group.members = data.result.members.map((member: SteamUser) => ({
            ...member,
            status: "loaded",
          }));
          group.games = data.result.games;
        } else {
          toast.push(data.error);
        }
      });
  }

  function PreloadUser(steamid: string) {
    const index = members.findIndex((member) => member.steam_id === steamid);
    if (index > -1) {
      members[index].status = "loading";
    }
    fetch(`${PUBLIC_BASE_API}/player/preload?steam_input=${steamid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const index = members.findIndex(
            (member) => member.steam_id === steamid
          );
          members[index].status = "loaded";
        } else {
          toast.push(data.error);
        }
      });
  }

  $: members = group ? group.members : [];
  $: games = group ? group.games : [];
</script>

<section class="form">
  <div class="avatars">
    {#each members as member}

      {#if member.status === "loading"}
      <div class="avatar">
        <div class="loading">
          <div class="inner-loader" />
        </div>
        <img
          src="https://avatars.akamai.steamstatic.com/{member.avatar_hash}_medium.jpg"
          alt=""
        />
      </div>
    {:else if member.status === "loaded"}
      <div class="avatar">
        <div
          class="action reload"
          on:click={() => {
            PreloadUser(member.steam_id);
          }}
          on:keydown={() => {
            PreloadUser(member.steam_id);
          }}
        >
          RELOAD
        </div>
        <img
          src="https://avatars.akamai.steamstatic.com/{member.avatar_hash}_medium.jpg"
          alt=""
        />
      </div>
      {:else}
          {member.status}
      {/if}
    {/each}
  </div>
  <div class="games">
    {#each games as game}
      <div
        class="game"
        style="background-image: linear-gradient(90deg, rgba(34, 36, 41, .75), rgba(34, 36, 41, .75)), url({game.background_image});"
      >
        <div class="banner">
          <img src={game.header_image} alt="" />
        </div>
        <div class="details">
          <a
            href="https://store.steampowered.com/app/{game.appid}"
            target="_blank"
          >
            <div class="name">{game.name}</div>
          </a>
          <div class="author">by {game.developers}</div>
          <div class="actions">
            <div>
              <a href="steam://run/{game.appid}">
                <Button small primary>LAUNCH</Button>
              </a>
            </div>
            <div>
              <a href={game.website} target="_blank">
                <Button small>WEB</Button>
              </a>
            </div>
          </div>
          <div class="tags">
            {#if game.is_free}
              <div class="tag free">FREE</div>
            {/if}
            <div class="tag hrs">
              {Math.floor(game.combined_playtime / 60).toLocaleString()} Hours
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</section>

<style lang="scss">
  section {
    width: 800px;
    max-width: calc(100% - 4rem);

    .avatars {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      .avatar {
        position: relative;
        display: flex;
        overflow: hidden;
        border-radius: 0.5rem;
        height: 4rem;
        width: 4rem;
        img {
          height: 100%;
          width: 100%;
        }
        &.empty {
          background-color: rgba(0, 0, 0, 0.35);
        }
        .action {
          opacity: 0;
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          transition: opacity 0.1s ease-in-out;
          cursor: pointer;
          font-size: 0.5rem;
          font-weight: 600;
        }
        &:hover {
          .action {
            opacity: 1;
          }
        }
        .loading {
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          transition: opacity 0.2s ease-in-out;
          cursor: pointer;
          .inner-loader {
            animation: spin 1s linear infinite;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            border-top-color: white;
            height: 1rem;
            width: 1rem;
          }
        }
      }
    }

    .games {
      .game {
        display: flex;
        min-height: 100px;
        margin-bottom: 0.5rem;
        overflow: hidden;
        border-radius: 0.5rem;
        .banner {
          height: 120px;
          img {
            height: 100%;
          }
          margin-right: 0.5rem;
        }
        .details {
          display: flex;
          flex-flow: column;
          padding: 0.5rem;
        }
        .name {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          line-height: 1rem;
          &:hover {
            text-decoration: underline;
          }
        }
        .author {
          font-size: 0.7rem;
          color: white;
          opacity: 0.5;
          margin-bottom: 0.5rem;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: .5rem;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          font-size: 0.5rem;
          font-weight: 700;
          margin-top: auto;
          .tag {
            margin: 0 0.3rem;
          }
          .free {
            color: rgb(57, 170, 51);
          }
          .hrs {
            color: rgb(62, 156, 218);
          }
        }
      }
    }
  }

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media only screen and (max-width: 500px) {
  section {
    .avatars {
      .avatar {
        height: 2.4rem;
        width: 2.4rem;
      }
    }
    .games {
      .game {
        flex-flow: column;
        .banner {
          max-width: 100%;
          width: 100%;
          height: inherit;
          margin-right: 0;
          img {
            height: inherit;
            width: 100%;
          }
        }
        .details {
          .name {
            font-size: .8rem;
          }
          .author {
            font-size: .6rem;
          }
        }
      }
    }
  }
}
</style>
