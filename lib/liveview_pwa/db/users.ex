defmodule LiveviewPwa.User do
  @moduledoc """
  This module provides functions to insert and lookup user tokens from an SQLite table.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias LiveviewPwa.{Sql3Repo}
  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  require Logger

  schema "users" do
    field(:user_token, :string)
    field(:is_valid, :boolean, default: true)
    timestamps()
  end

  def changeset(%__MODULE__{} = user, attrs) do
    user
    |> cast(attrs, [:user_token, :is_valid])
  end

  def hash(token) do
    :crypto.hash(:sha256, token) |> Base.encode16(case: :lower)
  end

  def create_user do
    %__MODULE__{}
    |> changeset(%{})
    |> Sql3Repo.insert!()
  end

  def lookup(user_token) do
    token = hash(user_token)
    query = from(u in __MODULE__, where: u.user_token == ^token)
    Sql3Repo.one(query)
  end

  def add_token(%__MODULE__{} = user) do
    access_token =
      Token.sign(Endpoint, access_salt(), user.id, max_age: access_ttl())

    access_hash =
      hash(access_token)

    user
    |> changeset(%{user_token: access_hash})
    |> Sql3Repo.update()
    |> case do
      {:ok, user} ->
        {:ok, Map.merge(user, %{access_token: access_token})}

      {:error, changeset} ->
        Logger.debug("#{inspect(changeset)}")
        :error
    end
  end

  def revoke_by_user_id(user_id) when is_integer(user_id) do
    case Sql3Repo.update_all(
           from(u in __MODULE__, where: u.id == ^user_id),
           set: [is_valid: false]
         ) do
      {0, _} -> {:error, :user_not_found}
      {1, _} -> {:ok, :revoked}
    end

    # Sql3Repo.get(__MODULE__, user_id)
    # |> case do
    #   nil ->
    #     {:error, :user_not_found}

    #   user ->
    #     user
    #     |> changeset(%{is_valid: false})
    #     |> Sql3Repo.update()
    # end
  end

  def revoke_by_token(user_token) when is_binary(user_token) do
    hash = hash(user_token)

    case Sql3Repo.update_all(
           from(u in __MODULE__, where: u.user_token == ^hash),
           set: [is_valid: false]
         ) do
      {0, _} -> {:error, :token_not_found}
      {1, _} -> {:ok, :revoked}
    end
  end

  def check_user(user_id, user_token) do
    Token.verify(Endpoint, access_salt(), user_token, max_age: access_ttl())
    |> case do
      {:ok, ^user_id} ->
        :ok

      {:error, _reason} ->
        Logger.warning("User #{user_id} not found or token expired")
        revoke_by_token(user_token)
        {:error, :unauthorized}
    end
  end

  def check_token(user_token) when is_nil(user_token) do
    {:error, :login}
  end

  def check_token(user_token) do
    case Token.verify(Endpoint, access_salt(), user_token, max_age: access_ttl()) do
      {:ok, user_id} ->
        {:ok, user_id}

      {:error, _} ->
        revoke_by_token(user_token)
        {:error, :unauthorized}
    end
  end

  def access_ttl, do: Application.get_env(:liveview_pwa, :access_token_ttl, 30)

  def access_salt, do: "user token"
end
