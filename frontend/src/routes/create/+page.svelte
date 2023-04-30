<script lang="ts">
  import { PUBLIC_BASE_API } from "$env/static/public";
  import Button from "../../components/button.svelte";
  import type { SteamUser } from "../../types";
  import { toast } from "@zerodevx/svelte-toast";
  let members: (SteamUser & { status: "loading" | "loaded" })[] = [];

  let searchInput: string = "";

  let foundUser: SteamUser | null = null;
  async function SearchUser() {
    try {
    await fetch(`${PUBLIC_BASE_API}/player/lookup?steam_input=${searchInput}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          foundUser = data.result;
        } else {
          toast.push(data.error);
        }
      })
    } catch (err) {
        console.error("errawr3  ", err);
    }
  }

  function PreloadUser(steamid: string) {
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
          members = members.filter((member) => member.steam_id !== steamid);
        }
      });
  }

  function CreateGroup() {
    if (members.length < 2) return;
    fetch(`${PUBLIC_BASE_API}/group/create?steam_inputs=${members.map(member => member.steam_id).join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = `/group?id=${data.result.id}`;
        } else {
          toast.push(data.error);
        }
      });
  }

  $: isLoading = members.some((member) => member.status === "loading");
</script>

<section>
  <h1>CREATE GROUP</h1>
  <p>
    Add yourself and your friends to the group to see which multiplayer games you all share in common ({members.length}
    / 10)
  </p>
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
          <div class="action trash" on:click={() => {
            members = members.filter(m => m.steam_id !== member.steam_id);
            searchInput = "";
            foundUser = null;
          }} on:keydown={() => {
            members = members.filter(m => m.steam_id !== member.steam_id);
            searchInput = "";
            foundUser = null;
          }} style={"cursor: pointer;"}>REMOVE</div>
          <img
            src="https://avatars.akamai.steamstatic.com/{member.avatar_hash}_medium.jpg"
            alt=""
          />
        </div>
        {:else}
            {member.status}
      {/if}
    {/each}

    {#each new Array(10 - members.length) as emptyItem}
    <div class="avatar empty" />
    {/each}
  </div>
  {#if members.length < 10}
    <hr />
    <div class="search-bar">
      <input
        type="text"
        placeholder="Find friend by nickname or steamid"
        bind:value={searchInput}
      />
      <Button grey onClick={SearchUser}>SEARCH</Button>
    </div>
    {#if foundUser}
      <div class="search">
        <div class="search-result">
          <div class="avatar">
            <img
              src="https://avatars.akamai.steamstatic.com/{foundUser.avatar_hash}_medium.jpg"
              alt=""
            />
          </div>
          <div class="data">
            <div class="name">{foundUser.username}</div>
            <div class="extra">{foundUser.steam_id}</div>
          </div>
          {#if !members.find((m) => foundUser && m?.steam_id === foundUser.steam_id)}
            <div class="action">
              <Button
                primary
                small
                onClick={() => {
                  if (foundUser) {
                    members.push({ ...foundUser, status: "loading" });
                    members = members;
                    PreloadUser(foundUser.steam_id);
                    searchInput = "";
                    foundUser = null;
                  }
                }}>+ ADD</Button
              >
            </div>
          {:else}
            <div class="action">
              <Button
                primary
                small
                onClick={() => {
                  if (foundUser) {
                      const steamId = foundUser.steam_id;
                    members = members.filter(m => m.steam_id !== steamId);
                    searchInput = "";
                    foundUser = null;
                  }
                }}>- REMOVE</Button
              >
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
  <hr />
  <Button primary full onClick={CreateGroup} disabled={members.length < 2 || isLoading}>CREATE GROUP</Button>
</section>

<style lang="scss">
  section {
    width: 900px;
    max-width: calc(100% - 4rem);
    h1 {
      font-size: 2rem;
      font-weight: 700;
      line-height: 2rem;
    }
    p {
      font-size: 0.8rem;
      line-height: 0.8rem;
      margin-bottom: 0.5rem;
      font-weight: 300;
    }
    hr {
      border-color: rgba(255, 255, 255, 0.35);
      border-top: none;
    }

    .avatars {
      display: flex;
      justify-content: space-evenly;
      flex-wrap: wrap;
      gap: 0.5rem;
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
          font-size: .65rem;
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

    .search-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      input {
        outline: none;
        flex: 1;
        border: none;
        padding: 0.5rem 0.1rem;
        border-bottom: 2px solid #d9d9d9;
        border-radius: 0;
        background: none;
        color: white;
      }
    }

    .search {
      .search-result {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        background-color: rgba(0, 0, 0, 0.35);
        padding-right: 0.5rem;
        .avatar {
          height: 3rem;
          width: 3rem;
          img {
            height: 100%;
            width: 100%;
          }
        }
        .data {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          .name {
            font-size: 1rem;
            font-weight: 700;
            line-height: 1rem;
          }
          .extra {
            font-size: 0.5rem;
            font-weight: 300;
            line-height: 0.8rem;
            color: #3fd847;
          }
        }
        .action {
          display: flex;
          justify-content: center;
          align-items: center;
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
</style>
