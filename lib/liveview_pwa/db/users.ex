defmodule LiveviewPwa.User do
  @moduledoc """
  This module provides functions to insert and lookup user tokens from an SQLite table.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias LiveviewPwa.{Sql3Repo, User}
  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  require Logger

  schema "users" do
    field(:user_token, :string)
    field(:refresh_token, :string)
    field(:is_valid, :boolean, default: true)
    timestamps()
  end

  def changeset(%__MODULE__{} = user, attrs) do
    user
    |> cast(attrs, [:user_token, :refresh_token, :is_valid])
  end

  def create_user do
    %__MODULE__{}
    |> changeset(%{})
    |> Sql3Repo.insert!()
  end

  def lookup(user_token) do
    query = from(u in __MODULE__, where: u.user_token == ^user_token)
    Sql3Repo.one(query)
  end

  def add_token(user_id) do
    access_token =
      Token.sign(Endpoint, access_salt(), user_id, max_age: access_ttl())

    refresh_token =
      Token.sign(Endpoint, refresh_salt(), user_id, max_age: refresh_ttl())

    case Sql3Repo.get(__MODULE__, user_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        user
        |> changeset(%{user_token: access_token, refresh_token: refresh_token})
        |> Sql3Repo.update()

        {:ok, access_token, refresh_token}
    end
  end

  def revoke(user_id_or_user_token) do
    value = "#{user_id_or_user_token}"

    User.lookup(value)
    |> case do
      nil ->
        Sql3Repo.get(__MODULE__, value)
        |> case do
          nil ->
            Logger.warning("User not found: #{value}")
            {:error, :user_not_found}

          user ->
            revoke(user.user_token)
        end

      user ->
        Logger.warning("Revoking user token: #{user.user_token}")

        {:ok, _} =
          changeset(user, %{is_valid: false}) |> Sql3Repo.update()
    end
  end

  def access_ttl, do: Application.get_env(:liveview_pwa, :access_token_ttl, 30)

  def refresh_ttl, do: Application.get_env(:liveview_pwa, :refresh_token_ttl, 60)

  def access_salt, do: "user token"
  def refresh_salt, do: "refresh token"
end
